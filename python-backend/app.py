#!/usr/bin/env python3
"""
app.py - Reddit Feedback Analyzer Backend
Ultra-fast 4-account fetcher with relevance filtering
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import MultiAccountRedditFetcher
from dotenv import load_dotenv
import os
import json
import glob
import traceback
from datetime import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)

# Create pre-process directory
os.makedirs("pre-process", exist_ok=True)

# Initialize fetcher with 4 accounts from .env
fetcher = MultiAccountRedditFetcher()
print(f"✅ Initialized with {len(fetcher.accounts)} Reddit account(s)")

sentiment_analyzer = None

def create_sentiment_analysis_from_file(reddit_file_path, query):
    """
    Create sentiment analysis from saved Reddit JSON file
    """
    try:
        from sentiment_analyzer import RedditSentimentAnalyzer
        analyzer = RedditSentimentAnalyzer()
        return analyzer.analyze_json_file(reddit_file_path)
    except ImportError:
        print("⚠️  sentiment_analyzer.py not found, skipping sentiment analysis")
        return None
    except Exception as e:
        print(f"⚠️  Sentiment analysis failed: {e}")
        return None


@app.route("/api/reddit/fetch-mass-comments", methods=["POST"])
def fetch_mass_comments():
    """
    Fetch mass comments with 4-account ultra-fast mode + relevance filtering
    """
    try:
        data = request.get_json()
        
        if not data or "query" not in data:
            return jsonify({"error": "Query is required"}), 400
        
        query = data["query"]
        target_comments = data.get("target_comments", 10000)
        min_score = data.get("min_score", 5)
        
        print(f"\n{'='*60}")
        print(f"📊 Mass Comment Fetch Request")
        print(f"   Query: {query}")
        print(f"   Target: {target_comments:,} comments")
        print(f"   Min Score: {min_score}")
        print(f"   Accounts: {len(fetcher.accounts)}")
        print(f"{'='*60}\n")
        
        # Progress callback for logging
        def progress_callback(current, total, stage):
            print(f"[{current}/{total}] {stage}")
        
        # Fetch comments with relevance filtering
        result = fetcher.fetch_mass_comments(
            query=query,
            target_comments=target_comments,
            min_score=min_score,
            progress_callback=progress_callback
        )
        
        # Save Reddit data to file
        timestamp = int(datetime.now().timestamp())
        reddit_file = f"pre-process/reddit_{query.replace(' ', '_')}_{timestamp}.json"
        
        with open(reddit_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Saved Reddit data: {reddit_file}")
        print(f"   Comments: {result['metadata']['totalComments']:,}")
        print(f"   Posts: {result['metadata']['totalPosts']:,}")
        print(f"   File size: {os.path.getsize(reddit_file) / 1024:.1f} KB\n")
        
        # Try to create sentiment analysis
        sentiment_result = create_sentiment_analysis_from_file(reddit_file, query)
        
        if sentiment_result:
            print("✅ Sentiment analysis completed\n")
            return jsonify(sentiment_result)
        else:
            # Return Reddit data even if sentiment analysis fails
            print("⚠️  Returning raw data (sentiment analysis unavailable)\n")
            return jsonify(result)
        
    except Exception as e:
        print(f"\n❌ Error in /api/reddit/fetch-mass-comments:")
        print(f"   {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sentiment/latest", methods=["GET"])
def get_latest_sentiment():
    """
    Get the latest sentiment analysis file
    """
    try:
        files = glob.glob("pre-process/sentiment_*.json")
        
        if not files:
            return jsonify({"error": "No sentiment files found"}), 404
        
        latest_file = max(files, key=os.path.getctime)
        
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return jsonify(data)
    
    except Exception as e:
        print(f"❌ Error fetching latest sentiment: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/reddit/latest", methods=["GET"])
def get_latest_reddit():
    """
    Get the latest Reddit data file
    """
    try:
        files = glob.glob("pre-process/reddit_*.json")
        
        if not files:
            return jsonify({"error": "No Reddit files found"}), 404
        
        latest_file = max(files, key=os.path.getctime)
        
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return jsonify(data)
    
    except Exception as e:
        print(f"❌ Error fetching latest Reddit data: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/list", methods=["GET"])
def list_files():
    """
    List all available data files
    """
    try:
        reddit_files = glob.glob("pre-process/reddit_*.json")
        sentiment_files = glob.glob("pre-process/sentiment_*.json")
        
        files = {
            "reddit": [
                {
                    "filename": os.path.basename(f),
                    "size_kb": round(os.path.getsize(f) / 1024, 1),
                    "created": datetime.fromtimestamp(os.path.getctime(f)).isoformat()
                }
                for f in sorted(reddit_files, key=os.path.getctime, reverse=True)
            ],
            "sentiment": [
                {
                    "filename": os.path.basename(f),
                    "size_kb": round(os.path.getsize(f) / 1024, 1),
                    "created": datetime.fromtimestamp(os.path.getctime(f)).isoformat()
                }
                for f in sorted(sentiment_files, key=os.path.getctime, reverse=True)
            ]
        }
        
        return jsonify(files)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        "status": "ok",
        "service": "Reddit Feedback Analyzer",
        "version": "4.0",
        "accounts": len(fetcher.accounts),
        "features": {
            "multi_account": True,
            "relevance_filtering": True,
            "sentiment_analysis": sentiment_analyzer is not None
        }
    })


if __name__ == "__main__":
    print("=" * 80)
    print("🚀 Reddit Feedback Analyzer API v4.0")
    print("=" * 80)
    print(f"✅ {len(fetcher.accounts)} Reddit account(s) loaded")
    print(f"✅ Relevance filtering enabled")
    print(f"✅ Ultra-fast mode active")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-mass-comments - Fetch comments (with filtering)")
    print("  GET  /api/sentiment/latest           - Get latest sentiment analysis")
    print("  GET  /api/reddit/latest              - Get latest Reddit data")
    print("  GET  /api/files/list                 - List all data files")
    print("  GET  /health                         - Health check")
    print("=" * 80)
    print("Server starting on http://0.0.0.0:5000\n")
    
    app.run(host="0.0.0.0", port=5000, debug=True)