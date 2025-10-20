# app.py
# Flask API server to expose Reddit fetching endpoints

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import RedditAPIFetcher
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Initialize Reddit fetcher
fetcher = RedditAPIFetcher()


@app.route('/api/reddit', methods=['GET'])
def fetch_reddit_posts():
    """
    Fetch Reddit posts
    Query params:
        - query: Search query (required)
        - limit: Number of posts (default: 35)
        - sort: Sort type (default: 'top')
        - t: Time filter (default: 'all')
        - after: Pagination token (optional)
    """
    try:
        query = request.args.get('query')
        if not query:
            return jsonify({'error': 'Search query parameter is required'}), 400

        limit = int(request.args.get('limit', 35))
        sort = request.args.get('sort', 'top')
        time_filter = request.args.get('t', 'all')
        after = request.args.get('after')

        result = fetcher.fetch_posts(
            query=query,
            limit=limit,
            sort=sort,
            time_filter=time_filter,
            after=after
        )

        return jsonify(result)

    except Exception as e:
        print(f"Error in /api/reddit: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reddit/comments', methods=['GET'])
def fetch_reddit_comments():
    """
    Fetch comments for a Reddit post
    Query params:
        - permalink: Post permalink (required)
        - limit: Number of comments (default: 100)
        - sort: Sort order (default: 'top')
    """
    try:
        permalink = request.args.get('permalink')
        if not permalink:
            return jsonify({'error': 'Permalink is required'}), 400

        limit = int(request.args.get('limit', 100))
        sort = request.args.get('sort', 'top')

        result = fetcher.fetch_comments(
            permalink=permalink,
            limit=limit,
            sort=sort
        )

        return jsonify(result)

    except Exception as e:
        print(f"Error in /api/reddit/comments: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reddit/fetch-optimized', methods=['POST'])
def fetch_optimized_reddit_data():
    """
    Fetch optimized Reddit data for sentiment analysis
    JSON body:
        - query: Search query (required)
        - num_posts: Number of posts (default: 35)
        - comments_per_post: Comments per post (default: 143)
    """
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required in request body'}), 400

        query = data['query']
        num_posts = data.get('num_posts', 35)
        comments_per_post = data.get('comments_per_post', 143)

        # Progress tracking (you can implement WebSocket for real-time updates)
        def progress_callback(current, total, stage):
            print(f"Progress: {current}/{total} - {stage}")

        result = fetcher.fetch_optimized_data(
            query=query,
            num_posts=num_posts,
            comments_per_post=comments_per_post,
            progress_callback=progress_callback
        )

        return jsonify(result)

    except Exception as e:
        print(f"Error in /api/reddit/fetch-optimized: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'Reddit API Fetcher'})


if __name__ == '__main__':
    # Run the Flask server
    # For production, use gunicorn or similar WSGI server
    print("=" * 60)
    print("Reddit API Fetcher - Python Backend")
    print("=" * 60)
    print("Server starting on http://localhost:5000")
    print("Endpoints:")
    print("  GET  /api/reddit                - Fetch posts")
    print("  GET  /api/reddit/comments       - Fetch comments")
    print("  POST /api/reddit/fetch-optimized - Fetch all data")
    print("  GET  /health                    - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
