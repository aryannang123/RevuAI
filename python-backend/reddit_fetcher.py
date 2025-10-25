# reddit_fetcher.py  (replace or add into your module)
import os
import time
import base64
import random
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import math

# === Config: tune these for faster fetching ===
MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT = int(os.getenv("MAX_REQ_PER_MIN_PER_ACC", "120"))  # increased from 60 to 120
MIN_REQUEST_INTERVAL = 60.0 / MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT  # seconds between requests per account on avg
MAX_WORKERS_PER_ACCOUNT = 6   # increased from 3 to 6 for more parallelism
GLOBAL_MAX_WORKERS = int(os.getenv("MAX_GLOBAL_WORKERS", "24"))  # increased from 12 to 24

# helpful UA variants (small rotation)
DEFAULT_USER_AGENTS = [
    "RevuAI/2.0 (+https://example.com)",
    "RevuAI-Fetcher/2.0",
    "RevuAI-Bot/2.0"
]

def _now_ts():
    return time.time()

class TokenBucket:
    """
    Simple token-bucket per account.
    Bucket refills continuously at rate tokens_per_sec, capacity = burst_capacity
    Call consume(1) to get permission; returns True if allowed.
    """
    def __init__(self, tokens_per_minute: float, burst_capacity: int = 6):
        self.rate = tokens_per_minute / 60.0
        self.capacity = max(burst_capacity, 1)
        self._tokens = self.capacity
        self._last = _now_ts()
        self.lock = threading.Lock()

    def consume(self, tokens: float = 1.0) -> bool:
        with self.lock:
            now = _now_ts()
            elapsed = now - self._last
            self._last = now
            self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
            if self._tokens >= tokens:
                self._tokens -= tokens
                return True
            return False

    def wait_for_token(self, timeout: Optional[float] = None) -> bool:
        """
        Block until token available or timeout. Returns True if token got consumed.
        """
        start = _now_ts()
        while True:
            if self.consume():
                return True
            if timeout is not None and _now_ts() - start > timeout:
                return False
            # sleep a small jittered amount to avoid spin
            time.sleep(0.02 + random.random() * 0.03)  # reduced sleep time

class AccountSession:
    def __init__(self, index: int, account_info: Dict[str, str], tokens_per_minute: int):
        self.index = index
        self.acc = account_info
        self.session = requests.Session()
        # Optionally configure a proxy per-account via REDDIT_PROXY_{index+1}
        proxy_env = os.getenv(f"REDDIT_PROXY_{index+1}") or os.getenv('REDDIT_PROXY')
        if proxy_env:
            self.session.proxies.update({
                'http': proxy_env,
                'https': proxy_env
            })
        self.token_bucket = TokenBucket(tokens_per_minute, burst_capacity=4)
        self.lock = threading.Lock()
        self.access_token = None
        self.token_expires_at = 0
        self.user_agent = account_info.get('user_agent') or random.choice(DEFAULT_USER_AGENTS)
        # small random initial delay to avoid simultaneous auth from many accounts
        self.next_available = _now_ts() + random.random()*0.5
        self.rate_limited_until = 0

    def set_user_agent(self, ua: str):
        self.user_agent = ua

class MultiAccountRedditFetcher:
    def __init__(self, accounts: List[Dict[str, str]] = None):
        # load accounts from env if not provided
        if accounts:
            self.accounts = accounts
        else:
            # same loader as your app.py: look for REDDIT_CLIENT_ID_1 etc.
            accs = []
            idx = 1
            while True:
                client_id = os.getenv(f'REDDIT_CLIENT_ID_{idx}') or (os.getenv('REDDIT_CLIENT_ID') if idx == 1 else None)
                client_secret = os.getenv(f'REDDIT_CLIENT_SECRET_{idx}') or (os.getenv('REDDIT_CLIENT_SECRET') if idx == 1 else None)
                username = os.getenv(f'REDDIT_USERNAME_{idx}') or (os.getenv('REDDIT_USERNAME') if idx == 1 else None)
                password = os.getenv(f'REDDIT_PASSWORD_{idx}') or (os.getenv('REDDIT_PASSWORD') if idx == 1 else None)
                if not all([client_id, client_secret, username, password]):
                    break
                accs.append({
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'username': username,
                    'password': password
                })
                idx += 1
            if not accs:
                # fallback to single account attempt
                accs = [{
                    'client_id': os.getenv('REDDIT_CLIENT_ID'),
                    'client_secret': os.getenv('REDDIT_CLIENT_SECRET'),
                    'username': os.getenv('REDDIT_USERNAME'),
                    'password': os.getenv('REDDIT_PASSWORD')
                }]
            self.accounts = accs

        # validate
        for i, a in enumerate(self.accounts):
            if not all([a.get('client_id'), a.get('client_secret'), a.get('username'), a.get('password')]):
                raise ValueError(f"Account {i} missing credentials")

        self.account_sessions: List[AccountSession] = [
            AccountSession(i, a, tokens_per_minute=MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT) for i, a in enumerate(self.accounts)
        ]

        self.auth_lock = threading.Lock()
        print(f"✓ Initialized with {len(self.account_sessions)} account(s)")

    # ---------------------
    # Authentication (thread-safe, cached)
    # ---------------------
    def _authenticate_account(self, acc_sess: AccountSession) -> str:
        with acc_sess.lock:
            now = _now_ts()
            if acc_sess.access_token and now < acc_sess.token_expires_at - 10:
                return acc_sess.access_token

            # throttle auth attempts slightly
            if now < acc_sess.next_available:
                time.sleep(acc_sess.next_available - now)

            acc = acc_sess.acc
            auth_string = f"{acc['client_id']}:{acc['client_secret']}"
            encoded = base64.b64encode(auth_string.encode()).decode()
            headers = {
                'Authorization': f"Basic {encoded}",
                'User-Agent': acc_sess.user_agent,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {
                'grant_type': 'password',
                'username': acc['username'],
                'password': acc['password']
            }
            resp = acc_sess.session.post("https://www.reddit.com/api/v1/access_token", headers=headers, data=data, timeout=10)
            if not resp.ok:
                # slight backoff on auth failure
                acc_sess.next_available = _now_ts() + 5 + random.random()*3
                raise Exception(f"Auth failure account {acc_sess.index}: {resp.status_code} {resp.text}")

            token_data = resp.json()
            acc_sess.access_token = token_data['access_token']
            # expires_in usually ~3600
            acc_sess.token_expires_at = _now_ts() + token_data.get('expires_in', 3600)
            # small buffer
            acc_sess.token_expires_at -= 10
            acc_sess.next_available = _now_ts() + 0.1
            return acc_sess.access_token

    # choose a currently-available account (non-blocking). returns index or None.
    def _pick_available_account(self) -> Optional[AccountSession]:
        # prefer accounts that are not currently rate-limited and have tokens
        random.shuffle(self.account_sessions)
        now = _now_ts()
        for acc_sess in self.account_sessions:
            if acc_sess.rate_limited_until > now:
                continue
            if acc_sess.token_bucket.consume(0):  # check without consuming now; we'll actually consume later
                return acc_sess
        # fallback: return the one with soonest availability
        return min(self.account_sessions, key=lambda a: a.rate_limited_until)

    # wrapper to make a safe API call using an account session
    def _safe_get(self, url: str, acc_sess: AccountSession, params=None, timeout=15) -> Optional[requests.Response]:
        # wait until token available for this account (reduced timeout for faster failover)
        if not acc_sess.token_bucket.wait_for_token(timeout=3):
            # couldn't get token -> account busy; return None so caller can pick another account
            return None

        # if account is currently rate-limited by prior header, respect it
        now = _now_ts()
        if acc_sess.rate_limited_until > now:
            return None

        try:
            token = self._authenticate_account(acc_sess)
        except Exception as e:
            # auth failed: mark account unavailable briefly
            acc_sess.rate_limited_until = _now_ts() + 10
            print(f"Auth error (account {acc_sess.index}): {e}")
            return None

        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': acc_sess.user_agent
        }
        try:
            resp = acc_sess.session.get(url, headers=headers, params=params, timeout=timeout)
        except Exception as e:
            # network error: allow retry later (reduced delay)
            print(f"Network error account {acc_sess.index}: {e}")
            acc_sess.rate_limited_until = _now_ts() + 1
            return None

        # If reddit returns rate limit headers, adjust account behavior
        if resp is not None and resp.headers:
            try:
                remaining = resp.headers.get('x-ratelimit-remaining')
                reset = resp.headers.get('x-ratelimit-reset')
                used = resp.headers.get('x-ratelimit-used')
                if remaining is not None and reset is not None:
                    try:
                        rem = float(remaining)
                        rst = float(reset)
                        if rem < 1:
                            # mark account as unavailable for reset seconds (add jitter)
                            acc_sess.rate_limited_until = _now_ts() + rst + random.uniform(0.5, 3.0)
                            print(f"Account {acc_sess.index} exhausted rate-limit; sleeping {rst:.1f}s")
                    except:
                        pass
            except Exception:
                pass

        # handle HTTP status codes
        if resp.status_code == 429:
            # Too Many Requests. reduce backoff time
            backoff = 2 + random.random()*3  # reduced from 5-10s to 2-5s
            acc_sess.rate_limited_until = _now_ts() + backoff
            print(f"429 for account {acc_sess.index}, backing off {backoff:.1f}s")
            return None
        if resp.status_code >= 500:
            # transient server error: small backoff
            acc_sess.rate_limited_until = _now_ts() + 2 + random.random()*3
            return None
        if not resp.ok:
            # other errors: just return None (caller handles)
            return None

        return resp

    # === fetch posts (kept similar to your original logic but using new safe calls) ===
    def fetch_posts_batch(self, query: str, limit: int = 100, sort: str = 'top', time_filter: str = 'month', account_idx: int = 0) -> List[Dict]:
        formatted_query = query.strip()
        if ' ' in formatted_query and not formatted_query.startswith('"'):
            formatted_query = f'"{formatted_query}"'
        params = {
            'q': formatted_query,
            'limit': limit,
            'sort': sort,
            't': time_filter,
            'type': 'link',
            'raw_json': 1
        }
        # try multiple attempts across accounts to reduce single-account load
        attempts = 0
        max_attempts = len(self.account_sessions) * 2
        last_exception = None
        while attempts < max_attempts:
            attempts += 1
            acc_sess = self.account_sessions[account_idx % len(self.account_sessions)]
            resp = self._safe_get("https://oauth.reddit.com/search.json", acc_sess, params=params)
            if resp is None:
                # pick a different account and continue
                account_idx = (account_idx + 1) % len(self.account_sessions)
                time.sleep(0.02)  # reduced yield time
                continue
            try:
                data = resp.json()
                posts = data.get('data', {}).get('children', [])
                # filter as before (keeps your relevance heuristics)
                text_posts = []
                query_keywords = [word.lower().strip() for word in query.lower().split() if len(word.strip()) > 2]
                for post in posts:
                    p = post['data']
                    if p.get('is_video') or p.get('post_hint') in ['image', 'hosted:video', 'rich:video']:
                        continue
                    if not p.get('selftext', '').strip() and len(p.get('title', '')) < 20:
                        continue
                    combined = f"{p.get('title','').lower()} {p.get('selftext','').lower()}"
                    if any(k in combined for k in query_keywords):
                        text_posts.append(post)
                return text_posts
            except Exception as e:
                last_exception = e
                account_idx = (account_idx + 1) % len(self.account_sessions)
                time.sleep(0.02 + random.random()*0.05)  # reduced retry delay
                continue
        # all attempts failed
        raise Exception(f"fetch_posts_batch failed after {attempts} attempts: {last_exception}")

    def fetch_comments_lightweight(self, permalink: str, limit: int = 50, min_score: int = 5, account_idx: int = 0, query: str = "") -> List[Dict]:
        clean_permalink = permalink[1:] if permalink.startswith('/') else permalink
        url = f"https://oauth.reddit.com/{clean_permalink}.json"
        params = {'limit': limit, 'sort': 'top', 'raw_json': 1}

        # attempt across accounts to reduce banning risk
        results = []
        for attempt in range(len(self.account_sessions)):
            acc_idx = (account_idx + attempt) % len(self.account_sessions)
            acc_sess = self.account_sessions[acc_idx]
            resp = self._safe_get(url, acc_sess, params=params)
            if resp is None:
                # try next account
                continue
            try:
                data = resp.json()
            except:
                continue

            # extract post title safely
            try:
                post_title = data[0]['data']['children'][0]['data'].get('title', '')
            except:
                post_title = ''

            comments_data = data[1]['data']['children'] if len(data) > 1 else []
            query_keywords = [word.lower().strip() for word in query.lower().split() if len(word.strip()) > 2] if query else []

            def extract_comments(comment_list, depth=0):
                for comment in comment_list:
                    if comment.get('kind') != 't1':
                        continue
                    c = comment['data']
                    score = c.get('score', 0)
                    body = c.get('body', '').strip()
                    if score < min_score or len(body) < 10 or body in ['[deleted]', '[removed]']:
                        continue
                    if query_keywords:
                        combined_text = f"{body.lower()} {post_title.lower()}"
                        if not any(k in combined_text for k in query_keywords) and (query.lower() not in combined_text):
                            continue
                    results.append({
                        'id': c['id'],
                        'text': body,
                        'score': score,
                        'post_title': post_title
                    })
                    if depth < 3:
                        replies = c.get('replies', {})
                        if isinstance(replies, dict) and 'data' in replies:
                            extract_comments(replies['data'].get('children', []), depth + 1)

            extract_comments(comments_data)
            # success -> return (do not keep hammering accounts)
            return results

        # if every account failed, return empty list so caller can handle
        return []

    def fetch_mass_comments(self, query: str, target_comments: int = 10000, min_score: int = 5, progress_callback=None) -> Dict[str, Any]:
        start = time.time()
        all_posts = []
        strategies = [
            {'sort': 'relevance', 't': 'all'},
            {'sort': 'relevance', 't': 'year'},
            {'sort': 'comments', 't': 'month'},
            {'sort': 'top', 't': 'month'},
            {'sort': 'hot', 't': 'month'},
            {'sort': 'new', 't': 'month'}
        ]
        # Phase 1: fetch posts in parallel
        max_workers = min(max(1, len(self.account_sessions) * MAX_WORKERS_PER_ACCOUNT), GLOBAL_MAX_WORKERS)
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = []
            for idx, strat in enumerate(strategies):
                account_idx = idx % len(self.account_sessions)
                futures.append(ex.submit(self.fetch_posts_batch, query, 100, strat['sort'], strat['t'], account_idx))
            for f in as_completed(futures):
                try:
                    posts = f.result()
                    all_posts.extend(posts)
                except Exception as e:
                    # continue; some strategies may fail due to rate-limit
                    print("strategy failed:", e)

        # dedupe/sort posts
        uniq = {p['data']['id']: p for p in all_posts}
        all_posts = list(uniq.values())
        all_posts.sort(key=lambda p: p['data'].get('num_comments', 0), reverse=True)

        # Phase 2: fetch comments parallel but with controlled concurrency
        comments_needed = target_comments
        comments_by_id = {}
        comments_per_post = 30
        estimated_posts = min(len(all_posts), (comments_needed // comments_per_post) + 200)
        posts_to_process = all_posts[:estimated_posts]

        if progress_callback:
            progress_callback(10, 100, 'Fetching comments')

        max_workers = min(len(self.account_sessions) * 8, GLOBAL_MAX_WORKERS)  # increased multiplier for faster processing
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = {}
            for i, post in enumerate(posts_to_process):
                acc_index = i % len(self.account_sessions)
                perm = post['data']['permalink']
                fut = ex.submit(self.fetch_comments_lightweight, perm, 100, min_score, acc_index, query)
                futures[fut] = perm
            completed = 0
            last_progress_time = time.time()
            for fut in as_completed(futures):
                completed += 1
                try:
                    comments = fut.result()
                    for c in comments:
                        comments_by_id[c['id']] = c
                except Exception as e:
                    print("comment fetch error:", e)
                # progress update
                if time.time() - last_progress_time > 1:
                    current = len(comments_by_id)
                    pct = min(10 + int((current / comments_needed) * 80), 95)
                    if progress_callback:
                        progress_callback(pct, 100, f'Comments: {current}/{comments_needed}')
                    last_progress_time = time.time()
                if len(comments_by_id) >= comments_needed:
                    break

        final = list(comments_by_id.values())
        final.sort(key=lambda c: c['score'], reverse=True)
        final = final[:target_comments]
        elapsed = time.time() - start
        stats = {
            'comments': final,
            'metadata': {
                'query': query,
                'totalComments': len(final),
                'targetComments': target_comments,
                'minScore': min_score,
                'fetchTime': round(elapsed, 2),
                'commentsPerSecond': round(len(final)/elapsed, 2) if elapsed > 0 else 0,
                'accountsUsed': len(self.account_sessions),
                'fetchedAt': datetime.utcnow().isoformat(),
            }
        }
        if progress_callback:
            progress_callback(100, 100, 'Complete')
        print(f"Fetch complete: {len(final)} comments in {elapsed:.1f}s (accounts={len(self.account_sessions)})")
        return stats
