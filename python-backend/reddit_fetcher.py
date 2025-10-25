#!/usr/bin/env python3
"""
reddit_fetcher.py
Optimized Reddit fetcher with higher concurrency, safe rate-limiting, and smoother token control.
"""

import os
import time
import base64
import random
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
from datetime import datetime


# === ⚙️ Config: tuned for faster fetch ===
MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT = int(os.getenv("MAX_REQ_PER_MIN_PER_ACC", "120"))
MIN_REQUEST_INTERVAL = 60.0 / MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT
MAX_WORKERS_PER_ACCOUNT = 5
GLOBAL_MAX_WORKERS = int(os.getenv("MAX_GLOBAL_WORKERS", "20"))
DEFAULT_USER_AGENTS = [
    "RevuAI/3.0 (+https://example.com)",
    "RevuAI-Fetcher/3.0",
    "RevuAI-Bot/3.0"
]


def _now_ts():
    return time.time()


# ==============================================================
# 🔒 Token Bucket for Rate Limiting
# ==============================================================
class TokenBucket:
    def __init__(self, tokens_per_minute: float, burst_capacity: int = 4):
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
        start = _now_ts()
        while True:
            if self.consume():
                return True
            if timeout is not None and _now_ts() - start > timeout:
                return False
            time.sleep(0.01 + random.random() * 0.02)


# ==============================================================
# 🧾 Account Session
# ==============================================================
class AccountSession:
    def __init__(self, index: int, account_info: Dict[str, str], tokens_per_minute: int):
        self.index = index
        self.acc = account_info
        self.session = requests.Session()

        proxy_env = os.getenv(f"REDDIT_PROXY_{index+1}") or os.getenv("REDDIT_PROXY")
        if proxy_env:
            self.session.proxies.update({'http': proxy_env, 'https': proxy_env})

        self.token_bucket = TokenBucket(tokens_per_minute, burst_capacity=5)
        self.lock = threading.Lock()
        self.access_token = None
        self.token_expires_at = 0
        self.user_agent = account_info.get('user_agent') or random.choice(DEFAULT_USER_AGENTS)
        self.next_available = _now_ts() + random.random() * 0.5
        self.rate_limited_until = 0


# ==============================================================
# 🚀 Multi-Account Reddit Fetcher
# ==============================================================
class MultiAccountRedditFetcher:
    def __init__(self, accounts: List[Dict[str, str]] = None):
        if accounts:
            self.accounts = accounts
        else:
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
            self.accounts = accs

        self.account_sessions: List[AccountSession] = [
            AccountSession(i, a, tokens_per_minute=MAX_REQUESTS_PER_MINUTE_PER_ACCOUNT) for i, a in enumerate(self.accounts)
        ]
        print(f"✓ Initialized with {len(self.account_sessions)} Reddit account(s)")

    def _authenticate_account(self, acc_sess: AccountSession) -> str:
        with acc_sess.lock:
            now = _now_ts()
            if acc_sess.access_token and now < acc_sess.token_expires_at - 10:
                return acc_sess.access_token

            acc = acc_sess.acc
            auth_string = f"{acc['client_id']}:{acc['client_secret']}"
            encoded = base64.b64encode(auth_string.encode()).decode()
            headers = {
                'Authorization': f"Basic {encoded}",
                'User-Agent': acc_sess.user_agent,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {'grant_type': 'password', 'username': acc['username'], 'password': acc['password']}
            resp = acc_sess.session.post("https://www.reddit.com/api/v1/access_token", headers=headers, data=data, timeout=10)
            if not resp.ok:
                raise Exception(f"Auth failure {resp.status_code}: {resp.text}")

            token_data = resp.json()
            acc_sess.access_token = token_data['access_token']
            acc_sess.token_expires_at = _now_ts() + token_data.get('expires_in', 3600)
            return acc_sess.access_token

    def _safe_get(self, url: str, acc_sess: AccountSession, params=None, timeout=15) -> Optional[requests.Response]:
        if not acc_sess.token_bucket.wait_for_token(timeout=10):
            return None
        try:
            token = self._authenticate_account(acc_sess)
        except Exception as e:
            print(f"Auth error (account {acc_sess.index}): {e}")
            return None
        headers = {'Authorization': f'Bearer {token}', 'User-Agent': acc_sess.user_agent}
        try:
            resp = acc_sess.session.get(url, headers=headers, params=params, timeout=timeout)
            return resp if resp.ok else None
        except Exception as e:
            print(f"Network error (account {acc_sess.index}): {e}")
            return None

    def fetch_comments_lightweight(self, permalink: str, limit: int = 50, min_score: int = 5, query: str = "") -> List[Dict]:
        url = f"https://oauth.reddit.com/{permalink.strip('/')}.json"
        params = {'limit': limit, 'sort': 'top', 'raw_json': 1}
        for acc_sess in self.account_sessions:
            resp = self._safe_get(url, acc_sess, params=params)
            if not resp:
                continue
            try:
                data = resp.json()
                comments = []
                post_title = data[0]['data']['children'][0]['data'].get('title', '')
                for comment in data[1]['data']['children']:
                    if comment['kind'] != 't1':
                        continue
                    c = comment['data']
                    body, score = c.get('body', '').strip(), c.get('score', 0)
                    if body not in ("[deleted]", "[removed]") and score >= min_score:
                        comments.append({'id': c['id'], 'text': body, 'score': score, 'post_title': post_title})
                return comments
            except Exception:
                continue
        return []

    def fetch_mass_comments(self, query: str, target_comments: int = 1000, min_score: int = 5, progress_callback=None) -> Dict[str, Any]:
        start = time.time()
        comments_by_id = {}

        search_url = "https://oauth.reddit.com/search.json"
        params = {'q': query, 'limit': 100, 'sort': 'top', 't': 'month', 'type': 'link', 'raw_json': 1}

        with ThreadPoolExecutor(max_workers=len(self.account_sessions) * MAX_WORKERS_PER_ACCOUNT) as ex:
            futures = [ex.submit(self._safe_get, search_url, acc, params) for acc in self.account_sessions]
            posts = []
            for fut in as_completed(futures):
                resp = fut.result()
                if resp:
                    try:
                        data = resp.json()
                        posts.extend(data.get('data', {}).get('children', []))
                    except:
                        pass

        for post in posts[:target_comments // 20]:
            link = post['data']['permalink']
            for c in self.fetch_comments_lightweight(link, 50, min_score, query):
                comments_by_id[c['id']] = c

        elapsed = time.time() - start
        print(f"✅ Reddit fetch complete: {len(comments_by_id)} comments in {elapsed:.1f}s (accounts={len(self.account_sessions)})")

        return {
            'comments': list(comments_by_id.values()),
            'metadata': {
                'query': query,
                'totalComments': len(comments_by_id),
                'targetComments': target_comments,
                'minScore': min_score,
                'fetchTime': round(elapsed, 2),
                'accountsUsed': len(self.account_sessions),
                'fetchedAt': datetime.utcnow().isoformat(),
            }
        }
