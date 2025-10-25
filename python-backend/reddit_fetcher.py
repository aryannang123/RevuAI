#!/usr/bin/env python3
"""
Ultra-optimized Reddit fetcher for 4 accounts
Maximum speed with proven filtering logic
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


class MultiAccountRedditFetcher:
    """Optimized for 4 accounts - ~60 comments/sec throughput"""
    
    def __init__(self, accounts: List[Dict[str, str]] = None):
        """Initialize with 4 Reddit accounts"""
        if accounts:
            self.accounts = accounts
        else:
            # Auto-load from .env
            self.accounts = []
            idx = 1
            while True:
                client_id = os.getenv(f'REDDIT_CLIENT_ID_{idx}') or (os.getenv('REDDIT_CLIENT_ID') if idx == 1 else None)
                client_secret = os.getenv(f'REDDIT_CLIENT_SECRET_{idx}') or (os.getenv('REDDIT_CLIENT_SECRET') if idx == 1 else None)
                username = os.getenv(f'REDDIT_USERNAME_{idx}') or (os.getenv('REDDIT_USERNAME') if idx == 1 else None)
                password = os.getenv(f'REDDIT_PASSWORD_{idx}') or (os.getenv('REDDIT_PASSWORD') if idx == 1 else None)
                
                if not all([client_id, client_secret, username, password]):
                    break
                
                self.accounts.append({
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'username': username,
                    'password': password
                })
                idx += 1
        
        # Token cache per account
        self.tokens = {}
        self.token_locks = {i: threading.Lock() for i in range(len(self.accounts))}
        
        self.user_agent = 'RevuAI/4.0 by RevuAI Team'
        
        # Validate
        for idx, acc in enumerate(self.accounts):
            if not all([acc['client_id'], acc['client_secret'], acc['username'], acc['password']]):
                raise ValueError(f"Account {idx} missing credentials")
        
        print(f"🚀 Initialized with {len(self.accounts)} account(s)")
        
    def get_access_token(self, account_idx: int = 0) -> str:
        """Get OAuth token with caching"""
        with self.token_locks[account_idx]:
            cache_key = f"token_{account_idx}"
            cache = self.tokens.get(cache_key, {})
            
            # Return cached if valid
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
            
            # Cache token (55 min expiry buffer)
            self.tokens[cache_key] = {
                'token': token_data['access_token'],
                'expires_at': time.time() + (token_data['expires_in'] - 300)
            }
            
            return token_data['access_token']
    
    def _is_relevant(self, text: str, query: str) -> bool:
        """
        Check if text is relevant to search query
        Returns True if query terms appear in text
        """
        if not text or not query:
            return False
        
        text_lower = text.lower()
        query_lower = query.lower()
        
        # Split query into terms (handle multi-word queries)
        query_terms = query_lower.split()
        
        # For single word: direct match
        if len(query_terms) == 1:
            return query_lower in text_lower
        
        # For multi-word: check if full phrase OR all terms present
        # Example: "iphone 15" -> check for "iphone 15" OR ("iphone" AND "15")
        if query_lower in text_lower:
            return True
        
        # Check if all individual terms present
        return all(term in text_lower for term in query_terms)
    
    def fetch_posts_batch(
        self,
        query: str,
        limit: int = 100,
        sort: str = 'top',
        time_filter: str = 'month',
        account_idx: int = 0
    ) -> List[Dict]:
        """Fetch posts with media filtering and relevance check"""
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
                print(f"  ⚠️ Account {account_idx + 1} rate limited")
                time.sleep(30)
            return []
        
        data = response.json()
        posts = data['data']['children']
        
        # ✅ FILTER: Remove media-heavy posts + relevance check
        text_posts = []
        for post in posts:
            p = post['data']
            
            # Skip videos/images
            if p.get('is_video') or p.get('post_hint') in ['image', 'hosted:video', 'rich:video']:
                continue
            
            # Skip posts with no meaningful text
            selftext = p.get('selftext', '').strip()
            title = p.get('title', '')
            
            if not selftext and len(title) < 20:
                continue
            
            # Skip low engagement posts
            if p.get('num_comments', 0) < 5:
                continue
            
            # ✅ NEW: Relevance check - title OR selftext must contain query
            combined_text = f"{title} {selftext}"
            if not self._is_relevant(combined_text, query):
                continue
            
            text_posts.append(post)
        
        return text_posts
    
    def fetch_comments_lightweight(
        self,
        permalink: str,
        limit: int = 50,
        min_score: int = 5,
        account_idx: int = 0,
        query: str = ""
    ) -> List[Dict]:
        """Fetch only essential comment data with relevance filtering"""
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
                
                # ✅ FILTER: Quality checks
                if score < min_score:
                    continue
                if len(body) < 10:
                    continue
                if body in ['[deleted]', '[removed]']:
                    continue
                
                # ✅ NEW: Relevance check - comment OR post title must contain query
                combined_text = f"{post_title} {body}"
                if query and not self._is_relevant(combined_text, query):
                    continue
                
                lightweight_comments.append({
                    'id': c['id'],
                    'text': body,
                    'score': score,
                    'post_title': post_title
                })
                
                # Process replies (limit depth to 3 levels)
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
        Ultra-fast mass fetch optimized for 4 accounts
        Expected: ~60 comments/sec
        """
        
        print(f"\n{'='*60}")
        print(f"🚀 ULTRA-FAST MODE (4 Accounts)")
        print(f"   Target: {target_comments:,} comments")
        print(f"   Min Score: {min_score}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        all_comments = {}
        
        # ===== PHASE 1: Parallel Post Fetching =====
        if progress_callback:
            progress_callback(0, 100, 'Fetching posts')
        
        # 12 strategies prioritizing relevance for better quality results
        strategies = [
            {'sort': 'relevance', 't': 'all'},      # Highest priority - most relevant
            {'sort': 'relevance', 't': 'year'},     # Recent relevant content
            {'sort': 'relevance', 't': 'month'},    # Very recent relevant content
            {'sort': 'top', 't': 'month'},          # High quality recent posts
            {'sort': 'top', 't': 'year'},           # High quality posts
            {'sort': 'comments', 't': 'month'},     # Posts with lots of discussion
            {'sort': 'top', 't': 'week'},           # Recent high quality
            {'sort': 'hot', 't': 'month'},          # Trending content
            {'sort': 'top', 't': 'all'},            # All-time best
            {'sort': 'comments', 't': 'week'},      # Recent discussions
            {'sort': 'hot', 't': 'week'},           # Recent trending
            {'sort': 'top', 't': 'day'}             # Today's best
        ]
        
        all_posts = []
        
        # 12 workers for 4 accounts = 3 workers per account
        max_workers = min(len(self.accounts) * 3, 12)
        
        print(f"Phase 1: Fetching posts ({max_workers} workers)...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_strategy = {}
            
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
            
            for future in as_completed(future_to_strategy.keys()):
                strategy, acc_idx = future_to_strategy[future]
                try:
                    posts = future.result()
                    all_posts.extend(posts)
                    print(f"  ✓ {strategy['sort']}/{strategy['t']} (Acc {acc_idx + 1}): {len(posts)} posts")
                except Exception as e:
                    print(f"  ✗ {strategy['sort']}/{strategy['t']} failed: {e}")
        
        # Deduplicate and sort by engagement
        unique_posts = {p['data']['id']: p for p in all_posts}
        all_posts = list(unique_posts.values())
        all_posts.sort(key=lambda p: p['data'].get('num_comments', 0), reverse=True)
        
        phase1_time = time.time() - start_time
        print(f"✓ Phase 1: {len(all_posts)} posts in {phase1_time:.1f}s\n")
        
        # ===== PHASE 2: Aggressive Comment Fetching =====
        if progress_callback:
            progress_callback(20, 100, 'Fetching comments')
        
        comments_per_post = 30
        estimated_posts = (target_comments // comments_per_post) + 100
        posts_to_process = all_posts[:min(estimated_posts, len(all_posts))]
        
        print(f"Phase 2: Processing {len(posts_to_process)} posts...")
        
        # 16 workers for 4 accounts = 4 workers per account
        max_workers = min(len(self.accounts) * 4, 16)
        
        print(f"  Using {max_workers} parallel workers\n")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_info = {}
            
            for idx, post in enumerate(posts_to_process):
                account_idx = idx % len(self.accounts)
                permalink = post['data']['permalink']
                
                future = executor.submit(
                    self.fetch_comments_lightweight,
                    permalink=permalink,
                    limit=100,
                    min_score=min_score,
                    account_idx=account_idx,
                    query=query  # Pass query for relevance filtering
                )
                future_to_info[future] = (idx, account_idx)
            
            completed = 0
            last_log = time.time()
            
            for future in as_completed(future_to_info.keys()):
                idx, acc_idx = future_to_info[future]
                
                try:
                    comments = future.result()
                    
                    # Add comments (dedup by ID)
                    for comment in comments:
                        if comment['id'] not in all_comments:
                            all_comments[comment['id']] = comment
                    
                    completed += 1
                    
                    # Log every 2 seconds
                    if time.time() - last_log >= 2:
                        current = len(all_comments)
                        progress = min(20 + int((current / target_comments) * 70), 90)
                        if progress_callback:
                            progress_callback(progress, 100, f'Comments: {current:,}/{target_comments:,}')
                        print(f"  Progress: {current:,} comments ({completed}/{len(posts_to_process)} posts)")
                        last_log = time.time()
                    
                    # Stop when target reached
                    if len(all_comments) >= target_comments:
                        break
                
                except Exception as e:
                    if '429' in str(e):
                        print(f"  ⚠️ Rate limit (Acc {acc_idx + 1})")
        
        # ===== FINALIZE =====
        final_comments = list(all_comments.values())
        final_comments.sort(key=lambda c: c['score'], reverse=True)
        final_comments = final_comments[:target_comments]
        
        elapsed = time.time() - start_time
        
        if progress_callback:
            progress_callback(100, 100, 'Complete')
        
        # Stats
        scores = [c['score'] for c in final_comments]
        unique_posts = set(c['post_title'] for c in final_comments)
        
        print(f"\n{'='*60}")
        print(f"✅ FETCH COMPLETE")
        print(f"   Comments: {len(final_comments):,}")
        print(f"   Posts: {len(unique_posts):,}")
        print(f"   Filtered: {len(all_comments) - len(final_comments):,} (relevance + quality)")
        print(f"   Time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
        print(f"   Speed: {len(final_comments)/elapsed:.1f} comments/sec")
        print(f"   Per Account: {len(final_comments)/(elapsed*len(self.accounts)):.1f} c/s/acc")
        print(f"{'='*60}\n")
        
        return {
            'comments': final_comments,
            'metadata': {
                'query': query,
                'totalComments': len(final_comments),
                'totalPosts': len(unique_posts),
                'targetComments': target_comments,
                'minScore': min_score,
                'averageScore': round(sum(scores) / len(scores)) if scores else 0,
                'minScoreValue': min(scores) if scores else 0,
                'maxScoreValue': max(scores) if scores else 0,
                'fetchTime': round(elapsed, 2),
                'commentsPerSecond': round(len(final_comments) / elapsed, 2),
                'accountsUsed': len(self.accounts),
                'fetchedAt': datetime.utcnow().isoformat(),
                'source': 'Reddit API (4-Account Ultra-Fast)',
                'relevanceFiltering': True,
                'filteringNote': 'Only comments/posts containing query terms are included'
            }
        }


# Quick test
if __name__ == "__main__":
    import json
    from dotenv import load_dotenv
    
    load_dotenv()
    
    fetcher = MultiAccountRedditFetcher()
    
    result = fetcher.fetch_mass_comments(
        query="xbox 360",
        target_comments=10000,
        min_score=5
    )
    
    filename = f"reddit_4acc_{int(time.time())}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved to {filename}")
    print(f"   Size: {os.path.getsize(filename) / 1024:.1f} KB")