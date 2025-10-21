# optimized_reddit_fetcher.py
# ULTRA-FAST Multi-Account Reddit Fetcher

import requests
import time
import os
import random
from typing import List, Dict, Any, Optional
from datetime import datetime
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class MultiAccountRedditFetcher:
    """
    High-performance Reddit fetcher using multiple accounts
    Optimized for maximum throughput with safety
    """

    def __init__(self, accounts: List[Dict[str, str]] = None):
        """Initialize with multiple Reddit accounts"""
        if accounts:
            self.accounts = accounts
        else:
            # Load single account from env
            self.accounts = [{
                'client_id': os.getenv('REDDIT_CLIENT_ID'),
                'client_secret': os.getenv('REDDIT_CLIENT_SECRET'),
                'username': os.getenv('REDDIT_USERNAME'),
                'password': os.getenv('REDDIT_PASSWORD')
            }]
        
        # Token cache for each account
        self.tokens = {}
        self.token_locks = {i: threading.Lock() for i in range(len(self.accounts))}
        
        self.user_agent = 'RevuAI/2.0 by RevuAI Team'
        
        # Validate accounts
        for idx, acc in enumerate(self.accounts):
            if not all([acc['client_id'], acc['client_secret'], acc['username'], acc['password']]):
                raise ValueError(f"Account {idx} missing credentials")
        
        print(f"✓ Initialized with {len(self.accounts)} account(s)")

    def get_access_token(self, account_idx: int = 0) -> str:
        """Get OAuth token for specific account with thread safety"""
        with self.token_locks[account_idx]:
            cache_key = f"token_{account_idx}"
            cache = self.tokens.get(cache_key, {})
            
            # Check cached token
            if cache.get('token') and time.time() < cache.get('expires_at', 0):
                return cache['token']
            
            # Fetch new token
            acc = self.accounts[account_idx]
            auth_string = f"{acc['client_id']}:{acc['client_secret']}"
            encoded_auth = base64.b64encode(auth_string.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {encoded_auth}',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': self.user_agent
            }
            
            data = {
                'grant_type': 'password',
                'username': acc['username'],
                'password': acc['password']
            }
            
            response = requests.post(
                'https://www.reddit.com/api/v1/access_token',
                headers=headers,
                data=data,
                timeout=10
            )
            
            if not response.ok:
                raise Exception(f"Auth failed for account {account_idx}: {response.text}")
            
            token_data = response.json()
            
            # Cache token
            self.tokens[cache_key] = {
                'token': token_data['access_token'],
                'expires_at': time.time() + (token_data['expires_in'] - 300)
            }
            
            print(f"  ✓ Account {account_idx + 1} authenticated")
            return token_data['access_token']

    def fetch_posts_batch(
        self,
        query: str,
        limit: int = 100,
        sort: str = 'top',
        time_filter: str = 'month',
        account_idx: int = 0
    ) -> List[Dict]:
        """Fetch posts using specific account"""
        token = self.get_access_token(account_idx)
        
        url = (
            f"https://oauth.reddit.com/search.json"
            f"?q={requests.utils.quote(query.strip())}"
            f"&limit={limit}"
            f"&sort={sort}"
            f"&t={time_filter}"
            f"&raw_json=1"
        )
        
        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': self.user_agent
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if not response.ok:
            if response.status_code == 429:
                print(f"⚠️  Account {account_idx} rate limited")
                time.sleep(30)
            raise Exception(f"Post fetch failed: {response.status_code}")
        
        data = response.json()
        posts = data['data']['children']
        
        # Filter out media-heavy posts
        text_posts = []
        for post in posts:
            p = post['data']
            # Skip media posts
            if p.get('is_video') or p.get('post_hint') in ['image', 'hosted:video', 'rich:video']:
                continue
            # Skip posts with no text
            if not p.get('selftext', '').strip() and len(p.get('title', '')) < 20:
                continue
            text_posts.append(post)
        
        return text_posts

    def fetch_comments_lightweight(
        self,
        permalink: str,
        limit: int = 50,
        min_score: int = 5,
        account_idx: int = 0
    ) -> List[Dict]:
        """Fetch only essential comment data"""
        token = self.get_access_token(account_idx)
        
        clean_permalink = permalink[1:] if permalink.startswith('/') else permalink
        
        url = (
            f"https://oauth.reddit.com/{clean_permalink}.json"
            f"?limit={limit}"
            f"&sort=top"
            f"&raw_json=1"
        )
        
        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': self.user_agent
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if not response.ok:
            return []
        
        data = response.json()
        
        # Extract post title
        post_title = data[0]['data']['children'][0]['data'].get('title', '')
        
        # Flatten comments
        comments_data = data[1]['data']['children'] if len(data) > 1 else []
        
        lightweight_comments = []
        
        def extract_comments(comment_list, depth=0):
            for comment in comment_list:
                if comment.get('kind') != 't1':
                    continue
                
                c = comment['data']
                score = c.get('score', 0)
                body = c.get('body', '').strip()
                
                # Filter low-quality comments
                if score < min_score or len(body) < 10 or body in ['[deleted]', '[removed]']:
                    continue
                
                lightweight_comments.append({
                    'id': c['id'],
                    'text': body,
                    'score': score,
                    'post_title': post_title
                })
                
                # Process replies (limit depth)
                if depth < 3:
                    replies = c.get('replies', {})
                    if isinstance(replies, dict) and 'data' in replies:
                        extract_comments(replies['data'].get('children', []), depth + 1)
        
        extract_comments(comments_data)
        
        return lightweight_comments

    def fetch_mass_comments(
        self,
        query: str,
        target_comments: int = 10000,
        min_score: int = 5,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Fetch 10K+ comments efficiently using multi-account parallel fetching
        
        OPTIMIZATIONS:
        - Parallel post fetching
        - Optimal thread pool sizing
        - Smart rate limit handling
        - Minimal delays (only when needed)
        """
        
        print(f"\n{'='*60}")
        print(f"🚀 ULTRA-FAST FETCH MODE")
        print(f"   Target: {target_comments} comments")
        print(f"   Accounts: {len(self.accounts)}")
        print(f"   Min Score: {min_score}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        all_comments = {}
        
        # PHASE 1: Parallel post fetching with ALL accounts
        if progress_callback:
            progress_callback(0, 100, 'Fetching posts in parallel')
        
        # Optimized strategies for 3 accounts (9 parallel requests)
        strategies = [
            {'sort': 'top', 't': 'month'},
            {'sort': 'top', 't': 'year'},
            {'sort': 'relevance', 't': 'all'},
            {'sort': 'comments', 't': 'month'},
            {'sort': 'top', 't': 'week'},
            {'sort': 'hot', 't': 'month'},
            {'sort': 'top', 't': 'all'},
            {'sort': 'hot', 't': 'week'},
            {'sort': 'relevance', 't': 'month'}
        ]
        
        all_posts = []
        
        # Use optimal workers for 3 accounts
        max_workers = min(len(self.accounts) * 3, 9)
        
        print(f"Phase 1: Fetching posts with {max_workers} parallel workers...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_strategy = {}
            
            # Submit ALL strategies at once
            for idx, strategy in enumerate(strategies):
                account_idx = idx % len(self.accounts)
                future = executor.submit(
                    self.fetch_posts_batch,
                    query=query,
                    limit=100,
                    sort=strategy['sort'],
                    time_filter=strategy['t'],
                    account_idx=account_idx
                )
                future_to_strategy[future] = (strategy, account_idx)
            
            # Collect results as they complete
            for future in as_completed(future_to_strategy.keys()):
                strategy, acc_idx = future_to_strategy[future]
                try:
                    posts = future.result()
                    all_posts.extend(posts)
                    print(f"  ✓ Strategy {strategy['sort']}/{strategy['t']} (Account {acc_idx + 1}): {len(posts)} posts")
                except Exception as e:
                    print(f"  ✗ Strategy {strategy['sort']}/{strategy['t']} failed: {e}")
        
        # Deduplicate and sort
        unique_posts = {p['data']['id']: p for p in all_posts}
        all_posts = list(unique_posts.values())
        all_posts.sort(key=lambda p: p['data'].get('num_comments', 0), reverse=True)
        
        phase1_time = time.time() - start_time
        print(f"✓ Phase 1 Complete: {len(all_posts)} posts in {phase1_time:.1f}s")
        
        # PHASE 2: Aggressive parallel comment fetching
        if progress_callback:
            progress_callback(20, 100, 'Fetching comments')
        
        comments_per_post = 30
        estimated_posts_needed = (target_comments // comments_per_post) + 100
        posts_to_process = all_posts[:min(estimated_posts_needed, len(all_posts))]
        
        print(f"\nPhase 2: Processing {len(posts_to_process)} posts for comments...")
        
        # CRITICAL: Optimal workers for 3 accounts
        # Each account = ~60 req/min = 1 req/sec safe rate
        # With 3 accounts: 9-12 parallel workers is optimal
        max_workers = min(len(self.accounts) * 4, 12)
        
        print(f"  Using {max_workers} parallel workers for comments")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_info = {}
            
            # Submit ALL posts at once (let executor handle queuing)
            for idx, post in enumerate(posts_to_process):
                account_idx = idx % len(self.accounts)
                permalink = post['data']['permalink']
                
                future = executor.submit(
                    self.fetch_comments_lightweight,
                    permalink=permalink,
                    limit=100,
                    min_score=min_score,
                    account_idx=account_idx
                )
                future_to_info[future] = (idx, account_idx)
            
            completed = 0
            last_log_time = time.time()
            
            for future in as_completed(future_to_info.keys()):
                idx, acc_idx = future_to_info[future]
                try:
                    comments = future.result()
                    
                    # Add to collection
                    for comment in comments:
                        if comment['id'] not in all_comments:
                            all_comments[comment['id']] = comment
                    
                    completed += 1
                    
                    # Log progress every 2 seconds
                    current_time = time.time()
                    if current_time - last_log_time >= 2:
                        current_count = len(all_comments)
                        progress_pct = min(20 + int((current_count / target_comments) * 70), 90)
                        if progress_callback:
                            progress_callback(progress_pct, 100, f'Comments: {current_count}/{target_comments}')
                        print(f"  Progress: {current_count} comments ({completed}/{len(posts_to_process)} posts)")
                        last_log_time = current_time
                    
                    # Stop if target reached (but let current batch finish)
                    if len(all_comments) >= target_comments and completed > len(posts_to_process) * 0.5:
                        break
                        
                except Exception as e:
                    error_msg = str(e)
                    if '429' in error_msg:
                        print(f"  ⚠️  Rate limit on account {acc_idx + 1}")
        
        # Finalize
        final_comments = list(all_comments.values())
        final_comments.sort(key=lambda c: c['score'], reverse=True)
        final_comments = final_comments[:target_comments]
        
        elapsed = time.time() - start_time
        
        if progress_callback:
            progress_callback(100, 100, 'Complete')
        
        print(f"\n{'='*60}")
        print(f"✅ FETCH COMPLETE")
        print(f"   Comments: {len(final_comments):,}")
        print(f"   Time: {elapsed:.1f}s")
        print(f"   Speed: {len(final_comments)/elapsed:.1f} comments/sec")
        print(f"   Efficiency: {len(final_comments)/(len(self.accounts)*elapsed):.1f} comments/sec/account")
        print(f"{'='*60}\n")
        
        # Statistics
        scores = [c['score'] for c in final_comments]
        unique_post_titles = set(c['post_title'] for c in final_comments)
        
        return {
            'comments': final_comments,
            'metadata': {
                'query': query,
                'totalComments': len(final_comments),
                'totalPosts': len(unique_post_titles),
                'targetComments': target_comments,
                'minScore': min_score,
                'averageScore': round(sum(scores) / len(scores)) if scores else 0,
                'minScoreValue': min(scores) if scores else 0,
                'maxScoreValue': max(scores) if scores else 0,
                'fetchTime': round(elapsed, 2),
                'commentsPerSecond': round(len(final_comments) / elapsed, 2),
                'accountsUsed': len(self.accounts),
                'fetchedAt': datetime.utcnow().isoformat(),
                'source': 'Reddit API (Ultra-Fast Multi-Account)'
            }
        }


# Test function
def main():
    import json
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Initialize fetcher (loads from .env automatically)
    fetcher = MultiAccountRedditFetcher()
    
    def progress_callback(current, total, stage):
        print(f"[{current}/{total}] {stage}")
    
    query = "iPhone 16"
    
    result = fetcher.fetch_mass_comments(
        query=query,
        target_comments=10000,
        min_score=5,
        progress_callback=progress_callback
    )
    
    # Save
    filename = f"reddit_comments_{query.replace(' ', '_')}_{int(time.time())}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved {len(result['comments'])} comments to {filename}")
    print(f"   File size: ~{os.path.getsize(filename) / 1024:.1f} KB")


if __name__ == "__main__":
    main()