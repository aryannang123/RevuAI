# app.py - Updated Flask API with mass comment fetching

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import MultiAccountRedditFetcher
import traceback
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize with multiple accounts if available
def load_accounts():
    """Load multiple Reddit accounts from environment"""
    accounts = []
    
    # Try to load multiple accounts (REDDIT_CLIENT_ID_1, REDDIT_CLIENT_ID_2, etc.)
    idx = 1
    while True:
        client_id = os.getenv(f'REDDIT_CLIENT_ID_{idx}') or (os.getenv('REDDIT_CLIENT_ID') if idx == 1 else None)
        client_secret = os.getenv(f'REDDIT_CLIENT_SECRET_{idx}') or (os.getenv('REDDIT_CLIENT_SECRET') if idx == 1 else None)
        username = os.getenv(f'REDDIT_USERNAME_{idx}') or (os.getenv('REDDIT_USERNAME') if idx == 1 else None)
        password = os.getenv(f'REDDIT_PASSWORD_{idx}') or (os.getenv('REDDIT_PASSWORD') if idx == 1 else None)
        
        if not all([client_id, client_secret, username, password]):
            break
        
        accounts.append({
            'client_id': client_id,
            'client_secret': client_secret,
            'username': username,
            'password': password
        })
        
        idx += 1
    
    return accounts if accounts else None

accounts = load_accounts()
fetcher = MultiAccountRedditFetcher(accounts=accounts)

print(f"✓ Initialized with {len(fetcher.accounts)} Reddit account(s)")


@app.route('/api/reddit/fetch-mass-comments', methods=['POST'])
def fetch_mass_comments():
    """
    Fetch 10K+ lightweight comments
    
    JSON body:
        - query: Search query (required)
        - target_comments: Target number (default: 10000)
        - min_score: Minimum comment score (default: 5)
    """
    try:
        data = request.get_json()

        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400

        query = data['query']
        target_comments = data.get('target_comments', 10000)
        min_score = data.get('min_score', 5)

        print(f"\n{'='*60}")
        print(f"📊 Mass Comment Fetch Request")
        print(f"   Query: {query}")
        print(f"   Target: {target_comments} comments")
        print(f"   Min Score: {min_score}")
        print(f"   Accounts: {len(fetcher.accounts)}")
        print(f"{'='*60}\n")

        def progress_callback(current, total, stage):
            print(f"[{current}/{total}] {stage}")

        result = fetcher.fetch_mass_comments(
            query=query,
            target_comments=target_comments,
            min_score=min_score,
            progress_callback=progress_callback
        )

        print(f"\n✅ Request completed:")
        print(f"   Comments: {result['metadata']['totalComments']}")
        print(f"   Time: {result['metadata']['fetchTime']}s")
        print(f"{'='*60}\n")

        return jsonify(result)

    except Exception as e:
        print(f"\n❌ Error in /api/reddit/fetch-mass-comments:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Reddit Mass Comment Fetcher',
        'version': '3.0',
        'accounts': len(fetcher.accounts)
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Reddit Mass Comment Fetcher v3.0")
    print("=" * 60)
    print(f"Active Accounts: {len(fetcher.accounts)}")
    print("Server starting on http://localhost:5000")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-mass-comments - Fetch 10K+ comments")
    print("  GET  /health                         - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)