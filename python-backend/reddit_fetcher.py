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

    def fetch_optimized_data(
        self,
        query: str,
        num_posts: int = 35,
        comments_per_post: int = 143,
        batch_size: int = 5,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Fetch optimized Reddit data for sentiment analysis

        Args:
            query: Search query
            num_posts: Number of high-engagement posts to fetch
            comments_per_post: Target number of comments per post
            batch_size: Number of posts to process in parallel
            progress_callback: Optional callback function(current, total, stage)

        Returns:
            Structured feedback data for analysis
        """
        # Stage 1: Fetch high-engagement posts
        if progress_callback:
            progress_callback(0, 7, 'Fetching high-engagement posts')

        posts_data = self.fetch_posts(
            query=query,
            limit=num_posts,
            sort='top',
            time_filter='all'
        )

        posts = posts_data['posts']

        if not posts:
            raise Exception('No posts found for this query')

        if progress_callback:
            progress_callback(1, 7, f'Found {len(posts)} posts')

        # Stage 2: Fetch comments for posts
        posts_with_comments = []
        total_comments = 0

        for i, post in enumerate(posts):
            try:
                if progress_callback:
                    progress_callback(
                        2 + (i / len(posts)) * 4,
                        7,
                        f'Fetching comments: {i+1}/{len(posts)} posts'
                    )

                permalink = post['data']['permalink']
                comments_data = self.fetch_comments(
                    permalink=permalink,
                    limit=100,
                    sort='top'
                )

                # Filter comments (only actual text comments, minimum length)
                comments = [
                    item['data'] for item in comments_data['comments']
                    if item['kind'] == 't1' and 
                       item.get('data', {}).get('body') and 
                       len(item['data']['body']) > 10
                ][:comments_per_post]

                posts_with_comments.append({
                    'post': post,
                    'comments': comments
                })

                total_comments += len(comments)

                # Rate limiting
                if (i + 1) % batch_size == 0 and i + 1 < len(posts):
                    time.sleep(0.5)

            except Exception as e:
                print(f"Warning: Failed to fetch comments for post {post['data']['id']}: {e}")
                posts_with_comments.append({
                    'post': post,
                    'comments': []
                })

        # Stage 3: Structure data for analysis
        if progress_callback:
            progress_callback(6, 7, 'Processing feedback data')

        feedback_data = {
            'metadata': {
                'query': query,
                'fetchedAt': datetime.utcnow().isoformat(),
                'totalPosts': len(posts_with_comments),
                'totalComments': total_comments,
                'source': 'Reddit API',
                'optimized': True,
                'purpose': 'Sentiment and Emotion Analysis'
            },
            'posts': []
        }

        for item in posts_with_comments:
            post_data = item['post']['data']

            feedback_data['posts'].append({
                # Post metadata
                'id': post_data['id'],
                'title': post_data['title'],
                'author': post_data['author'],
                'subreddit': post_data['subreddit'],
                'content': post_data.get('selftext', ''),
                'upvotes': post_data['ups'],
                'commentCount': post_data['num_comments'],
                'url': f"https://reddit.com{post_data['permalink']}",
                'createdAt': datetime.fromtimestamp(post_data['created_utc']).isoformat(),

                # Comments
                'comments': [
                    {
                        'id': comment['id'],
                        'author': comment['author'],
                        'text': comment['body'],
                        'score': comment['score'],
                        'createdAt': datetime.fromtimestamp(comment['created_utc']).isoformat(),
                        'depth': comment.get('depth', 0)
                    }
                    for comment in item['comments']
                ]
            })

        if progress_callback:
            progress_callback(7, 7, 'Complete')

        return feedback_data


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

    # Fetch optimized data
    query = "python programming"
    print(f"Fetching Reddit data for query: {query}")

    try:
        data = fetcher.fetch_optimized_data(
            query=query,
            num_posts=35,
            comments_per_post=143,
            progress_callback=progress_callback
        )

        # Save to file
        filename = f"reddit_feedback_{query.replace(' ', '_')}_{int(time.time())}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Successfully saved {len(data['posts'])} posts with {data['metadata']['totalComments']} comments to {filename}")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
