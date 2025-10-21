# optimized_reddit_fetcher.py
# High-performance Reddit data fetcher for 10K+ comments

import requests
import time
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import random
class MultiAccountRedditFetcher:
    """
    High-performance Reddit fetcher using multiple accounts
    Optimized for 10K+ comments with minimal data
    """

    def __init__(self, accounts: List[Dict[str, str]] = None):
        """
        Initialize with multiple Reddit accounts
        
        Args:
            accounts: List of dicts with keys: client_id, client_secret, username, password
                     If None, loads from environment variables
        """
        if accounts:
            self.accounts = accounts
        else:
            # Load single account from env (backward compatible)
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
                data=data
            )
            
            if not response.ok:
                raise Exception(f"Auth failed for account {account_idx}: {response.text}")
            
            token_data = response.json()
            
            # Cache token
            self.tokens[cache_key] = {
                'token': token_data['access_token'],
                'expires_at': time.time() + (token_data['expires_in'] - 300)
            }
            
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
        
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            raise Exception(f"Post fetch failed: {response.status_code}")
        
        data = response.json()
        posts = data['data']['children']
        
        # Filter out media-heavy posts (images/videos)
        text_posts = []
        for post in posts:
            p = post['data']
            # Skip if it's primarily media
            if p.get('is_video') or p.get('post_hint') in ['image', 'hosted:video', 'rich:video']:
                continue
            # Skip if no text content
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
        """
        Fetch only essential comment data
        
        Returns: List of {id, text, score, post_title}
        """
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
        
        response = requests.get(url, headers=headers)
        
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
                
                # Process replies (but limit depth to avoid spam)
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
        
        Args:
            query: Search query
            target_comments: Target number of comments (default 10000)
            min_score: Minimum comment score filter (default 5)
            progress_callback: Optional callback(current, total, stage)
        
        Returns:
            {
                'comments': [{'id', 'text', 'score', 'post_title'}, ...],
                'metadata': {...}
            }
        """
        
        print(f"\n{'='*60}")
        print(f"🚀 MASS FETCH MODE: Targeting {target_comments} comments")
        print(f"   Accounts: {len(self.accounts)}")
        print(f"   Min Score: {min_score}")
        print(f"{'='*60}\n")
        
        start_time = time.time()
        all_comments = {}  # Use dict for deduplication by ID
        
        # PHASE 1: Fetch posts from multiple strategies
        if progress_callback:
            progress_callback(0, 100, 'Fetching posts')
        
        strategies = [
            {'sort': 'top', 't': 'month'},
            {'sort': 'top', 't': 'year'},
            {'sort': 'relevance', 't': 'all'},
            {'sort': 'comments', 't': 'month'}
        ]
        
        all_posts = []
        
        with ThreadPoolExecutor(max_workers=len(self.accounts)) as executor:
            futures = []
            
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
                futures.append(future)
            
            for future in as_completed(futures):
                try:
                    posts = future.result()
                    all_posts.extend(posts)
                except Exception as e:
                    print(f"Warning: Post fetch failed: {e}")
        
        # Deduplicate posts
        unique_posts = {p['data']['id']: p for p in all_posts}
        all_posts = list(unique_posts.values())
        
        # Sort by comment count
        all_posts.sort(key=lambda p: p['data'].get('num_comments', 0), reverse=True)
        
        print(f"✓ PHASE 1: Found {len(all_posts)} unique text posts")
        
        # PHASE 2: Fetch comments in parallel
        if progress_callback:
            progress_callback(20, 100, 'Fetching comments')
        
        comments_per_post = 30  # Fetch top 30 from each post
        estimated_posts_needed = (target_comments // comments_per_post) + 50
        posts_to_process = all_posts[:min(estimated_posts_needed, len(all_posts))]
        
        print(f"✓ PHASE 2: Processing {len(posts_to_process)} posts for comments")
        
        with ThreadPoolExecutor(max_workers=len(self.accounts) * 2) as executor:
            futures = []
            
            for idx, post in enumerate(posts_to_process):
                if len(all_comments) >= target_comments:
                    break
                
                account_idx = idx % len(self.accounts)
                permalink = post['data']['permalink']
                
                future = executor.submit(
                    self.fetch_comments_lightweight,
                    permalink=permalink,
                    limit=100,
                    min_score=min_score,
                    account_idx=account_idx
                )
                futures.append((future, idx))
            
            completed = 0
            for future, idx in futures:
                try:
                    comments = future.result()
                    
                    # Add to collection (deduplication by ID)
                    for comment in comments:
                        if comment['id'] not in all_comments:
                            all_comments[comment['id']] = comment
                    
                    completed += 1
                    
                    if completed % 10 == 0:
                        current_count = len(all_comments)
                        progress_pct = min(20 + int((current_count / target_comments) * 70), 90)
                        if progress_callback:
                            progress_callback(progress_pct, 100, f'Comments: {current_count}/{target_comments}')
                        print(f"  Progress: {current_count} comments from {completed} posts")
                    
                    # Add random delay (more human-like)
                    time.sleep(random.uniform(0.5, 1.2))
                    
                    # Longer break every 25 posts
                    if completed % 25 == 0 and completed > 0:
                        pause = random.uniform(3, 6)
                        print(f"  Taking a {pause:.1f}s break...")
                        time.sleep(pause)
                    
                    # Stop if target reached
                    if len(all_comments) >= target_comments:
                        break
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    # Handle rate limiting
                    if '429' in error_msg:
                        print(f"⚠️  Rate limit hit! Pausing for 60s...")
                        time.sleep(60)
                    
                    print(f"Warning: Comment fetch failed for post {idx}: {e}")
        
        # Convert to list and sort by score
        final_comments = list(all_comments.values())
        final_comments.sort(key=lambda c: c['score'], reverse=True)
        
        # Take top N comments
        final_comments = final_comments[:target_comments]
        
        elapsed = time.time() - start_time
        
        if progress_callback:
            progress_callback(100, 100, 'Complete')
        
        print(f"\n{'='*60}")
        print(f"✅ FETCH COMPLETE")
        print(f"   Comments: {len(final_comments)}")
        print(f"   Time: {elapsed:.1f}s")
        print(f"   Rate: {len(final_comments)/elapsed:.1f} comments/sec")
        print(f"{'='*60}\n")
        
        # Calculate statistics
        scores = [c['score'] for c in final_comments]
        
        return {
            'comments': final_comments,
            'metadata': {
                'query': query,
                'totalComments': len(final_comments),
                'targetComments': target_comments,
                'minScore': min_score,
                'averageScore': round(sum(scores) / len(scores)) if scores else 0,
                'minScoreValue': min(scores) if scores else 0,
                'maxScoreValue': max(scores) if scores else 0,
                'fetchTime': round(elapsed, 2),
                'commentsPerSecond': round(len(final_comments) / elapsed, 2),
                'accountsUsed': len(self.accounts),
                'fetchedAt': datetime.utcnow().isoformat(),
                'source': 'Reddit API (Multi-Account Optimized)'
            }
        }


# Example usage
def main():
    import json
    from dotenv import load_dotenv
    
    load_dotenv()
    
    #Option 2: Multiple accounts (faster)
    fetcher = MultiAccountRedditFetcher(accounts=[
        {
            'client_id': 'xxx1',
            'client_secret': 'yyy1',
            'username': 'user1',
            'password': 'pass1'
        },
        {
            'client_id': 'xxx2',
            'client_secret': 'yyy2',
            'username': 'user2',
            'password': 'pass2'
        },
                {
            'client_id': 'xxx3',
            'client_secret': 'yyy3',
            'username': 'user3',
            'password': 'pass3'
        }

    ])
    
    def progress_callback(current, total, stage):
        print(f"[{current}/{total}] {stage}")
    
    query = "iPhone 16"
    
    result = fetcher.fetch_mass_comments(
        query=query,
        target_comments=10000,
        min_score=5,
        progress_callback=progress_callback
    )
    
    # Save lightweight data
    filename = f"reddit_comments_{query.replace(' ', '_')}_{int(time.time())}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved {len(result['comments'])} comments to {filename}")
    print(f"   File size: ~{os.path.getsize(filename) / 1024:.1f} KB")


if __name__ == "__main__":
    main()