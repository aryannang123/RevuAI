#!/usr/bin/env python3
"""
app.py - Reddit Feedback Analyzer Backend
Now uses `spacesedan/reddit-sentiment-analysis-longformer`
for nuanced 5-class Reddit sentiment analysis.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import MultiAccountRedditFetcher
from dotenv import load_dotenv
import os, json, glob, traceback
from datetime import datetime

# ========== Initialization ==========
load_dotenv()
app = Flask(__name__)
CORS(app)
os.makedirs("pre-process", exist_ok=True)

# ========== Load Reddit Accounts ==========
def load_accounts():
    accounts = []
    idx = 1
    while True:
        client_id = os.getenv(f"REDDIT_CLIENT_ID_{idx}") or (os.getenv("REDDIT_CLIENT_ID") if idx == 1 else None)
        client_secret = os.getenv(f"REDDIT_CLIENT_SECRET_{idx}") or (os.getenv("REDDIT_CLIENT_SECRET") if idx == 1 else None)
        username = os.getenv(f"REDDIT_USERNAME_{idx}") or (os.getenv("REDDIT_USERNAME") if idx == 1 else None)
        password = os.getenv(f"REDDIT_PASSWORD_{idx}") or (os.getenv("REDDIT_PASSWORD") if idx == 1 else None)
        if not all([client_id, client_secret, username, password]):
            break
        accounts.append({
            "client_id": client_id,
            "client_secret": client_secret,
            "username": username,
            "password": password
        })
        idx += 1
    return accounts

accounts = load_accounts()
fetcher = MultiAccountRedditFetcher(accounts=accounts)
sentiment_analyzer = None
print(f"✅ Loaded {len(fetcher.accounts)} Reddit account(s).")


# ========== Sentiment Analysis Helper ==========
def create_sentiment_analysis_from_file(reddit_file_path, query):
    """
    Run 5-class Reddit-specific sentiment analysis using the Longformer model.
    """
    global sentiment_analyzer
    print(f"\n🧠 Starting sentiment analysis for '{query}'")

    with open(reddit_file_path, "r", encoding="utf-8") as f:
        reddit_data = json.load(f)

    comments = reddit_data.get("comments", [])
    if not comments:
        raise Exception("No comments found in Reddit data")

    # Initialize analyzer
    if sentiment_analyzer is None:
        print("🤖 Loading Longformer sentiment analyzer...")
        from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
        import torch
        model_name = "spacesedan/reddit-sentiment-analysis-longformer"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        device = 0 if torch.cuda.is_available() else -1
        sentiment_analyzer = pipeline("text-classification", model=model, tokenizer=tokenizer, device=device)

    # Model → human mapping
    label_map = {
        "LABEL_0": {"bucket": "negative", "desc": "very frustrated / dissatisfied", "score": -2},
        "LABEL_1": {"bucket": "negative", "desc": "frustrated / dissatisfied", "score": -1},
        "LABEL_2": {"bucket": "neutral", "desc": "neutral / no strong feeling", "score": 0},
        "LABEL_3": {"bucket": "positive", "desc": "satisfied / positive", "score": 1},
        "LABEL_4": {"bucket": "positive", "desc": "very satisfied / delighted", "score": 2},
    }

    analyzed_comments = []
    buckets = {"positive": 0, "negative": 0, "neutral": 0}
    five_class_counts = {"very_negative": 0, "negative": 0, "neutral": 0, "positive": 0, "very_positive": 0}

    # Process in batches
    for i in range(0, len(comments), 16):
        batch = comments[i:i + 16]
        texts = [c.get("text", "")[:1024] for c in batch if c.get("text")]
        if not texts:
            continue

        results = sentiment_analyzer(texts, truncation=True)
        for j, result in enumerate(results):
            label = result["label"]
            score = result["score"]
            mapped = label_map.get(label, {"bucket": "neutral", "desc": "neutral", "score": 0})
            bucket = mapped["bucket"]

            # Update counts
            if label == "LABEL_0":
                five_class_counts["very_negative"] += 1
            elif label == "LABEL_1":
                five_class_counts["negative"] += 1
            elif label == "LABEL_2":
                five_class_counts["neutral"] += 1
            elif label == "LABEL_3":
                five_class_counts["positive"] += 1
            elif label == "LABEL_4":
                five_class_counts["very_positive"] += 1

            buckets[bucket] += 1

            analyzed_comments.append({
                "id": batch[j].get("id", f"comment_{i+j}"),
                "text": texts[j],
                "label": label,
                "mapped_label": mapped["desc"],
                "bucket": bucket,
                "confidence": round(score, 4)
            })

    total = len(analyzed_comments)
    if total == 0:
        raise Exception("No comments analyzed")

    perc_3 = {k: round((v / total) * 100, 2) for k, v in buckets.items()}
    perc_5 = {k: round((v / total) * 100, 2) for k, v in five_class_counts.items()}
    dominant = max(perc_3, key=perc_3.get)

    # Optional AI summary
    try:
        print("🧠 Generating AI summary...")
        from ai_summary_generator import AISummaryGenerator
        ai_gen = AISummaryGenerator()
        ai_summary = ai_gen.generate_paragraph_summary({"comments": analyzed_comments, "metadata": perc_3}, query)
    except Exception as e:
        print(f"⚠️ AI summary failed: {e}")
        ai_summary = {
            "paragraph_summary": f"Analysis of {total} Reddit comments about '{query}' shows {dominant} sentiment.",
            "model_used": "fallback"
        }

    timestamp = int(datetime.now().timestamp())
    sentiment_result = {
        "metadata": {
            "query": query,
            "total_comments": total,
            "analyzed_at": datetime.now().isoformat(),
            "dominant_sentiment": dominant,
            "sentiment_breakdown_3class": perc_3,
            "sentiment_breakdown_5class": perc_5,
        },
        "ai_summary": ai_summary,
        "comments": analyzed_comments,
    }

    # Save output
    out_path = f"pre-process/sentiment_{query.replace(' ', '_')}_{timestamp}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(sentiment_result, f, indent=2, ensure_ascii=False)

    print(f"✅ Sentiment analysis saved: {out_path}")
    return sentiment_result


# ========== API ROUTES ==========

@app.route("/api/reddit/fetch-mass-comments", methods=["POST"])
def fetch_mass_comments():
    """
    Fetch Reddit comments and automatically analyze sentiment.
    """
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
    """Return the latest sentiment analysis JSON for Chart.js frontend."""
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


@app.route("/api/sentiment/files", methods=["GET"])
def list_sentiment_files():
    files = glob.glob("pre-process/sentiment_*.json")
    info = []
    for fpath in files:
        info.append({
            "filename": os.path.basename(fpath),
            "created_at": datetime.fromtimestamp(os.path.getctime(fpath)).isoformat(),
            "size_kb": round(os.path.getsize(fpath)/1024, 2)
        })
    return jsonify({"files": info, "total": len(info)})


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "accounts": len(fetcher.accounts),
        "sentiment_model": "spacesedan/reddit-sentiment-analysis-longformer",
        "sentiment_analyzer_loaded": sentiment_analyzer is not None
    })


# ========== MAIN ==========
if __name__ == "__main__":
    print("="*80)
    print("🔥 Reddit Feedback Analyzer API")
    print("="*80)
    print("POST /api/reddit/fetch-mass-comments  → Fetch & Analyze automatically")
    print("GET  /api/sentiment/latest             → Latest sentiment for Chart.js")
    print("GET  /api/sentiment/files              → List all sentiment files")
    print("GET  /health                           → Health check")
    print("="*80)
    app.run(host="0.0.0.0", port=5000, debug=True)
