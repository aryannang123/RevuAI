# app.py - Updated Flask API server

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import RedditAPIFetcher
import traceback
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Initialize Reddit fetcher
fetcher = RedditAPIFetcher()


@app.route('/api/reddit/fetch-optimized', methods=['POST'])
def fetch_optimized_reddit_data():
    """
    Fetch optimized Reddit data for sentiment analysis
    JSON body:
        - query: Search query (required)
        - num_posts: Number of posts (default: 35)
        - max_comments: Max total comments (default: 5000)
    """
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required in request body'}), 400

        query = data['query']
        num_posts = data.get('num_posts', 35)
        max_comments = data.get('max_comments', 5000)

        print(f"\n{'='*60}")
        print(f"📊 Fetching Reddit data for: {query}")
        print(f"   Target: {num_posts} posts, {max_comments} comments max")
        print(f"{'='*60}\n")

        # Progress tracking
        def progress_callback(current, total, stage):
            print(f"Progress: {current}/{total} - {stage}")

        # Use the new optimized method
        result = fetcher.fetch_optimized_data_v2(
            query=query,
            num_posts=num_posts,
            max_comments=max_comments,
            progress_callback=progress_callback
        )

        print(f"\n✅ Successfully fetched:")
        print(f"   Posts: {result['metadata']['totalPosts']}")
        print(f"   Comments: {result['metadata']['totalComments']}")
        print(f"{'='*60}\n")

        return jsonify(result)

    except Exception as e:
        print(f"\n❌ Error in /api/reddit/fetch-optimized:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Reddit API Fetcher - Python Backend',
        'version': '2.0'
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Reddit API Fetcher - Python Backend v2.0")
    print("=" * 60)
    print("Server starting on http://localhost:5000")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-optimized - Fetch all data")
    print("  GET  /health                     - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)