#!/usr/bin/env python3
"""
app.py - Reddit Feedback Analyzer Backend
Now uses Reddit-only FastRedditFetcher.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from fast_reddit_fetcher import FastRedditFetcher
from dotenv import load_dotenv
import os, json, glob, traceback
from datetime import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)
os.makedirs("pre-process", exist_ok=True)

fetcher = FastRedditFetcher(use_live_api_only=True)
sentiment_analyzer = None
print("✅ FastRedditFetcher loaded successfully.")

def create_sentiment_analysis_from_file(reddit_file_path, query):
    from sentiment_analyzer import RedditSentimentAnalyzer
    analyzer = RedditSentimentAnalyzer()
    return analyzer.analyze_json_file(reddit_file_path)

@app.route("/api/reddit/fetch-mass-comments", methods=["POST"])
def fetch_mass_comments():
    try:
        data = request.get_json()
        if not data or "query" not in data:
            return jsonify({"error": "Query required"}), 400
        query = data["query"]
        target_comments = data.get("target_comments", 1000)
        min_score = data.get("min_score", 5)

        print(f"\n🔍 Fetching comments for '{query}' ...")
        result = fetcher.fetch_mass_comments(query=query, target_comments=target_comments, min_score=min_score)

        timestamp = int(datetime.now().timestamp())
        reddit_file = f"pre-process/reddit_{query.replace(' ', '_')}_{timestamp}.json"
        with open(reddit_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved Reddit data: {reddit_file}")

        sentiment_result = create_sentiment_analysis_from_file(reddit_file, query)
        return jsonify(sentiment_result)
    except Exception as e:
        print(f"❌ Error in fetch-mass-comments: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/sentiment/latest", methods=["GET"])
def get_latest_sentiment():
    try:
        files = glob.glob("pre-process/sentiment_*.json")
        if not files:
            return jsonify({"error": "No sentiment files found"}), 404
        latest_file = max(files, key=os.path.getctime)
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "sentiment_analyzer_loaded": sentiment_analyzer is not None,
    })

if __name__ == "__main__":
    print("="*80)
    print("🔥 Reddit Feedback Analyzer API")
    print("="*80)
    app.run(host="0.0.0.0", port=5000, debug=True)
