# reddit_fetcher.py
# Python backend for Reddit API data fetching

import requests
import time
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import base64

class RedditAPIFetcher:
    """
    Handles Reddit API authentication and data fetching
    """

    def __init__(self):
        # Load credentials from environment variables
        self.client_id = os.getenv('REDDIT_CLIENT_ID')
        self.client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        self.username = os.getenv('REDDIT_USERNAME')
        self.password = os.getenv('REDDIT_PASSWORD')

        # Token caching
        self.access_token: Optional[str] = None
        self.token_expires_at: float = 0

        # User agent
        self.user_agent = 'RevuAI/0.1 by RevuAI Team'

        # Validate credentials
        if not all([self.client_id, self.client_secret, self.username, self.password]):
            raise ValueError("Missing Reddit API credentials in environment variables")

    def get_access_token(self) -> str:
        """
        Get Reddit OAuth access token (with caching)
        """
        # Check if cached token is still valid
        if self.access_token and time.time() < self.token_expires_at:
            print("Using cached Reddit access token")
            return self.access_token

        # Fetch new token
        print("Fetching new Reddit access token")

        auth_string = f"{self.client_id}:{self.client_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()

        headers = {
            'Authorization': f'Basic {encoded_auth}',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': self.user_agent
        }

        data = {
            'grant_type': 'password',
            'username': self.username,
            'password': self.password
        }

        response = requests.post(
            'https://www.reddit.com/api/v1/access_token',
            headers=headers,
            data=data
        )

        if not response.ok:
            raise Exception(f"Failed to authenticate with Reddit: {response.text}")

        token_data = response.json()

        # Cache token with 5-minute buffer before expiry
        self.access_token = token_data['access_token']
        self.token_expires_at = time.time() + (token_data['expires_in'] - 300)

        return self.access_token

    def fetch_posts(
        self,
        query: str,
        limit: int = 35,
        sort: str = 'top',
        time_filter: str = 'all',
        after: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch Reddit posts based on search query

        Args:
            query: Search query string
            limit: Number of posts to fetch (max 100)
            sort: Sort type ('relevance', 'hot', 'top', 'new', 'comments')
            time_filter: Time filter ('hour', 'day', 'week', 'month', 'year', 'all')
            after: Pagination token

        Returns:
            Dictionary containing posts and pagination info
        """
        token = self.get_access_token()

        # Build URL
        url = (
            f"https://oauth.reddit.com/search.json"
            f"?q={requests.utils.quote(query.strip())}"
            f"&limit={limit}"
            f"&sort={sort}"
            f"&t={time_filter}"
            f"&raw_json=1"
        )

        if after:
            url += f"&after={after}"

        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': self.user_agent
        }

        print(f"Fetching posts: sort={sort}, t={time_filter}, after={after or 'none'}")

        response = requests.get(url, headers=headers)

        if not response.ok:
            raise Exception(f"Reddit API error: {response.status_code} - {response.text}")

        data = response.json()

        posts = data['data']['children']
        print(f"✓ Returned {len(posts)} posts, next after: {data['data'].get('after', 'none')}")

        return {
            'posts': posts,
            'after': data['data'].get('after'),
            'before': data['data'].get('before'),
            'dist': data['data'].get('dist'),
            'count': len(posts)
        }

    def fetch_comments(
        self,
        permalink: str,
        limit: int = 100,
        sort: str = 'top'
    ) -> Dict[str, Any]:
        """
        Fetch comments for a specific Reddit post

        Args:
            permalink: Post permalink (e.g., '/r/python/comments/xyz/title/')
            limit: Number of comments to fetch
            sort: Sort order ('confidence', 'top', 'new', 'controversial', 'old', 'qa')

        Returns:
            Dictionary containing comments
        """
        token = self.get_access_token()

        # Clean permalink
        clean_permalink = permalink[1:] if permalink.startswith('/') else permalink

        url = (
            f"https://oauth.reddit.com/{clean_permalink}.json"
            f"?limit={limit}"
            f"&sort={sort}"
            f"&raw_json=1"
        )

        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': self.user_agent
        }

        print(f"Fetching comments from: {clean_permalink}")

        response = requests.get(url, headers=headers)

        if not response.ok:
            raise Exception(f"Failed to fetch comments: {response.status_code} - {response.text}")

        data = response.json()

        # Reddit returns [post_data, comments_data]
        comments_data = data[1] if len(data) > 1 else {'data': {'children': []}}
        comments = comments_data['data']['children']

        return {
            'comments': comments,
            'count': len(comments)
        }

    def flatten_comment(self, comment_data: Dict, depth: int = 0) -> List[Dict]:
        """
        Recursively flatten nested Reddit comments
        
        Args:
            comment_data: Comment data from Reddit API
            depth: Current nesting depth
            
        Returns:
            List of flattened comment dictionaries
        """
        if not comment_data or comment_data.get('kind') != 't1':
            return []
        
        data = comment_data.get('data', {})
        
        # Base comment
        flat_comment = {
            'id': data.get('id'),
            'author': data.get('author'),
            'body': data.get('body', ''),
            'score': data.get('score', 0),
            'createdAt': datetime.fromtimestamp(data.get('created_utc', 0)).isoformat(),
            'depth': depth,
            'isSubmitter': data.get('is_submitter', False),
            'distinguished': data.get('distinguished')
        }
        
        result = [flat_comment]
        
        # Recursively process replies
        replies = data.get('replies', {})
        if isinstance(replies, dict) and 'data' in replies:
            children = replies['data'].get('children', [])
            for reply in children:
                result.extend(self.flatten_comment(reply, depth + 1))
        
        return result

    def fetch_optimized_data_v2(
        self,
        query: str,
        num_posts: int = 35,
        max_comments: int = 5000,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Fetch optimized Reddit data with high-engagement posts and top comments
        
        Args:
            query: Search query
            num_posts: Number of posts to target (will filter to high-engagement)
            max_comments: Maximum total comments to fetch
            progress_callback: Optional callback(current, total, stage)
            
        Returns:
            Structured data ready for sentiment analysis
        """
        
        # PHASE 1: Fetch high-engagement posts from multiple strategies
        if progress_callback:
            progress_callback(0, 3, 'Fetching high-engagement posts')
        
        all_posts_map = {}
        strategies = [
            {'sort': 'top', 't': 'month'},
            {'sort': 'top', 't': 'year'},
            {'sort': 'relevance', 't': 'all'}
        ]
        
        for idx, strategy in enumerate(strategies):
            try:
                if progress_callback:
                    progress_callback(idx, 3, f"Fetching posts: {strategy['sort']}/{strategy['t']}")
                
                result = self.fetch_posts(
                    query=query,
                    limit=100,
                    sort=strategy['sort'],
                    time_filter=strategy['t']
                )
                
                for post in result['posts']:
                    post_id = post['data']['id']
                    if post_id not in all_posts_map:
                        all_posts_map[post_id] = post
                
                time.sleep(0.8)
                
            except Exception as e:
                print(f"Warning: Failed strategy {strategy}: {e}")
                continue
        
        # Filter and sort by engagement
        all_posts = list(all_posts_map.values())
        high_engagement_posts = [
            p for p in all_posts 
            if p['data'].get('num_comments', 0) >= 10
        ]
        high_engagement_posts.sort(
            key=lambda p: p['data'].get('num_comments', 0), 
            reverse=True
        )
        selected_posts = high_engagement_posts[:num_posts]
        
        if not selected_posts:
            raise Exception('No high-engagement posts found for this query')
        
        print(f"✓ PHASE 1: Selected {len(selected_posts)} high-engagement posts")
        
        # PHASE 2: Fetch and flatten comments
        if progress_callback:
            progress_callback(1, len(selected_posts) + 2, 'Fetching comments')
        
        posts_with_comments = []
        total_comments = 0
        comments_per_post = max_comments // len(selected_posts)
        
        for idx, post in enumerate(selected_posts):
            if total_comments >= max_comments:
                break
            
            if progress_callback:
                progress_callback(
                    idx + 2,
                    len(selected_posts) + 2,
                    f'Fetching comments: {idx + 1}/{len(selected_posts)}'
                )
            
            try:
                permalink = post['data']['permalink']
                comments_result = self.fetch_comments(
                    permalink=permalink,
                    limit=100,
                    sort='top'
                )
                
                # Flatten all comments
                all_flat_comments = []
                for comment in comments_result['comments']:
                    flattened = self.flatten_comment(comment)
                    all_flat_comments.extend(flattened)
                
                # Sort by score and take top comments
                all_flat_comments.sort(key=lambda c: c['score'], reverse=True)
                top_comments = all_flat_comments[:min(comments_per_post, max_comments - total_comments)]
                
                if top_comments:
                    posts_with_comments.append({
                        'post': post,
                        'comments': top_comments
                    })
                    total_comments += len(top_comments)
                    print(f"  ✓ Post {idx + 1}: {len(top_comments)} comments | Total: {total_comments}")
                
                # Rate limiting
                if (idx + 1) % 5 == 0:
                    time.sleep(1.0)
                else:
                    time.sleep(0.7)
                    
            except Exception as e:
                print(f"Warning: Failed to fetch comments for post {post['data']['id']}: {e}")
                continue
        
        print(f"✓ PHASE 2: {total_comments} total comments from {len(posts_with_comments)} posts")
        
        # PHASE 3: Structure data
        if progress_callback:
            progress_callback(
                len(selected_posts) + 2,
                len(selected_posts) + 2,
                'Processing complete'
            )
        
        processed_data = {
            'metadata': {
                'query': query,
                'fetchedAt': datetime.utcnow().isoformat(),
                'totalPosts': len(posts_with_comments),
                'totalComments': total_comments,
                'averageCommentsPerPost': round(total_comments / len(posts_with_comments)) if posts_with_comments else 0,
                'source': 'Reddit API',
                'fetchStrategy': 'High-engagement posts with top comments',
                'note': 'Focused on posts with active discussions and quality comments'
            },
            'postsWithComments': []
        }
        
        for item in posts_with_comments:
            post_data = item['post']['data']
            comments = item['comments']
            
            # Calculate comment statistics
            comment_scores = [c['score'] for c in comments]
            
            processed_data['postsWithComments'].append({
                'post': {
                    'id': post_data['id'],
                    'title': post_data['title'],
                    'author': post_data['author'],
                    'subreddit': post_data['subreddit'],
                    'content': post_data.get('selftext', ''),
                    'upvotes': post_data['ups'],
                    'score': post_data['score'],
                    'commentCount': post_data['num_comments'],
                    'url': f"https://reddit.com{post_data['permalink']}",
                    'createdAt': datetime.fromtimestamp(post_data['created_utc']).isoformat(),
                    'mediaUrl': post_data.get('url'),
                    'thumbnail': post_data.get('thumbnail'),
                    'isVideo': post_data.get('is_video', False)
                },
                'comments': comments,
                'commentsSummary': {
                    'total': len(comments),
                    'topLevelComments': len([c for c in comments if c['depth'] == 0]),
                    'nestedComments': len([c for c in comments if c['depth'] > 0]),
                    'averageScore': round(sum(comment_scores) / len(comment_scores)) if comment_scores else 0,
                    'maxDepth': max([c['depth'] for c in comments]) if comments else 0,
                    'minScore': min(comment_scores) if comment_scores else 0,
                    'maxScore': max(comment_scores) if comment_scores else 0
                }
            })
        
        return processed_data


# Example usage function
def main():
    """
    Example usage of RedditAPIFetcher
    """
    import json
    from dotenv import load_dotenv

    # Load environment variables
    load_dotenv()

    # Initialize fetcher
    fetcher = RedditAPIFetcher()

    # Define progress callback
    def progress_callback(current, total, stage):
        print(f"Progress: {current}/{total} - {stage}")

    # Fetch optimized data using v2
    query = "iPhone 16"
    print(f"Fetching Reddit data for query: {query}")

    try:
        data = fetcher.fetch_optimized_data_v2(
            query=query,
            num_posts=35,
            max_comments=5000,
            progress_callback=progress_callback
        )

        # Save to file
        filename = f"reddit_feedback_{query.replace(' ', '_')}_{int(time.time())}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Successfully saved {len(data['postsWithComments'])} posts with {data['metadata']['totalComments']} comments to {filename}")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()