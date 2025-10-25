#!/usr/bin/env python3
"""
app.py - Optimized Reddit Feedback Analyzer Backend + Gemini Chat
Features:
- Session-based chat (dataset loaded once per session)
- Proper API key rotation across 4 accounts
- Efficient context management
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from reddit_fetcher import MultiAccountRedditFetcher
from dotenv import load_dotenv
import os
import json
import glob
import traceback
from datetime import datetime
from ai_summary_generator import AISummaryGenerator

load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-change-in-production')
CORS(app, supports_credentials=True)

# Create directories
os.makedirs("pre-process", exist_ok=True)
os.makedirs("pre-process_sentiments", exist_ok=True)

# Initialize Reddit fetcher
fetcher = MultiAccountRedditFetcher()
print(f"✅ Initialized with {len(fetcher.accounts)} Reddit account(s)")

sentiment_analyzer = None

# Try to initialize Gemini chatbot
try:
    gemini_generator = AISummaryGenerator()
    print(f"✅ Gemini chat bot initialized with {len(gemini_generator.models)} API keys")
except Exception as e:
    gemini_generator = None
    print(f"⚠️ Gemini chat bot not available: {e}")

# In-memory session storage for dataset contexts
chat_sessions = {}


# ==========================================================
# 🧠 OPTIMIZED GEMINI CHAT ENDPOINT
# ==========================================================
@app.route("/api/gemini/chat", methods=["POST"])
def gemini_chat():
    """
    Optimized chat endpoint:
    - Loads dataset once per session
    - Uses session ID for conversation continuity
    - Rotates API keys properly
    """
    try:
        if not gemini_generator:
            return jsonify({"error": "Gemini service not available"}), 503

        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"error": "Message is required"}), 400

        user_message = data["message"]
        session_id = data.get("sessionId", "default")  # Get session ID from frontend
        dataset_path = data.get("dataset")
        conversation_history = data.get("conversationHistory", [])

        print(f"\n💬 Gemini Chat Request")
        print(f"   Session ID: {session_id}")
        print(f"   Message: {user_message[:100]}...")
        print(f"   History length: {len(conversation_history)}")

        # 📦 Load dataset context ONCE per session
        if session_id not in chat_sessions:
            print(f"🔄 Loading dataset for new session: {session_id}")
            
            # Find latest dataset if not provided
            if not dataset_path:
                sentiment_files = glob.glob("pre-process_sentiments/enhanced_sentiment_*.json")
                if not sentiment_files:
                    sentiment_files = glob.glob("pre-process/sentiment_*.json")
                if sentiment_files:
                    dataset_path = max(sentiment_files, key=os.path.getctime)
                    print(f"🗂️ Using latest dataset: {dataset_path}")

            # Load and cache dataset summary (not full data)
            dataset_summary = ""
            if dataset_path and os.path.exists(dataset_path):
                with open(dataset_path, "r", encoding="utf-8") as f:
                    full_data = json.load(f)
                    
                    # Extract only key metrics (not all comments)
                    summary_data = {
                        "overall_sentiment": full_data.get("overall_sentiment"),
                        "total_comments_analyzed": full_data.get("total_comments_analyzed"),
                        "sentiment_breakdown_5class": full_data.get("sentiment_breakdown_5class"),
                        "emotion_breakdown": full_data.get("emotion_breakdown"),
                        "confidence_breakdown": full_data.get("confidence_breakdown"),
                        "ai_summary": full_data.get("ai_summary", {}).get("paragraph_summary", ""),
                        "top_comments": {
                            "most_positive": full_data.get("top_comments", {}).get("most_very_positive", {}).get("text", "N/A")[:200],
                            "most_negative": full_data.get("top_comments", {}).get("most_very_negative", {}).get("text", "N/A")[:200]
                        }
                    }
                    dataset_summary = json.dumps(summary_data, indent=2)
                    
                    # Cache for this session
                    chat_sessions[session_id] = {
                        "dataset_summary": dataset_summary,
                        "dataset_path": dataset_path,
                        "loaded_at": datetime.now().isoformat()
                    }
                    print(f"✅ Dataset cached for session (size: {len(dataset_summary)} chars)")
            else:
                print("⚠️ No valid dataset found")
                chat_sessions[session_id] = {
                    "dataset_summary": "No dataset available",
                    "dataset_path": None,
                    "loaded_at": datetime.now().isoformat()
                }
        else:
            print(f"♻️ Using cached dataset for session: {session_id}")
            dataset_summary = chat_sessions[session_id]["dataset_summary"]

        # Build efficient conversation context (last 6 messages only)
        conversation_snippet = "\n".join(
            [f"{msg.get('role', 'user').upper()}: {msg.get('content', '')[:200]}" 
             for msg in conversation_history[-6:]]
        )

        # 🎯 Optimized prompt (dataset loaded once, not repeated)
        prompt = f"""You are a data analysis assistant helping users understand Reddit sentiment analysis.

DATASET SUMMARY (loaded once for this session):
{dataset_summary}

RECENT CONVERSATION:
{conversation_snippet}

USER QUESTION:
{user_message}

Provide a clear, concise answer using the dataset summary. Reference specific numbers and percentages when relevant. Keep responses under 150 words unless the user asks for detailed analysis."""

        print(f"📊 Prompt size: {len(prompt)} chars (optimized)")
        print(f"🔄 Current API rotation index: {gemini_generator.current_model_index}")

        # Generate response with automatic API key rotation
        response = gemini_generator.generate_response(prompt)

        if not response:
            print("⚠️ Gemini returned empty response")
            return jsonify({"response": "Gemini did not return any text."})

        print(f"✅ Response generated successfully")
        print(f"   Length: {len(response)} chars")
        print(f"   Next API index: {gemini_generator.current_model_index}")

        return jsonify({
            "response": response.strip(),
            "sessionId": session_id,
            "apiKeyUsed": gemini_generator.current_model_index
        })

    except Exception as e:
        print(f"❌ Error in /api/gemini/chat: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/gemini/reset-session", methods=["POST"])
def reset_chat_session():
    """Clear cached session data"""
    try:
        data = request.get_json()
        session_id = data.get("sessionId", "default")
        
        if session_id in chat_sessions:
            del chat_sessions[session_id]
            print(f"🗑️ Cleared session: {session_id}")
            return jsonify({"success": True, "message": "Session reset"})
        
        return jsonify({"success": False, "message": "Session not found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 🧩 EXISTING ENDPOINTS (UNCHANGED)
# ==========================================================
@app.route("/api/reddit/fetch-mass-comments", methods=["POST"])
def fetch_mass_comments():
    """Fetch mass comments with 4-account ultra-fast mode + relevance filtering"""
    try:
        data = request.get_json()
        if not data or "query" not in data:
            return jsonify({"error": "Query is required"}), 400

        query = data["query"]
        target_comments = data.get("target_comments", 2000)
        min_score = data.get("min_score", 5)

        print(f"\n{'='*60}")
        print(f"📊 Mass Comment Fetch Request")
        print(f"   Query: {query}")
        print(f"   Target: {target_comments:,} comments")
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

        print(f"\n🎭 Running automatic enhanced sentiment analysis...")
        try:
            from enhanced_sentiment_analyzer import EnhancedSentimentAnalyzer
            timestamp = int(datetime.now().timestamp())
            temp_reddit_file = f"pre-process/reddit_{query.replace(' ', '_')}_{timestamp}.json"

            with open(temp_reddit_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            analyzer = EnhancedSentimentAnalyzer()
            sentiment_result = analyzer.analyze_json_file(temp_reddit_file)

            if sentiment_result:
                sentiment_dir = "pre-process_sentiments"
                os.makedirs(sentiment_dir, exist_ok=True)
                sentiment_file = os.path.join(
                    sentiment_dir,
                    f"enhanced_sentiment_{query.replace(' ', '_')}_{timestamp}.json"
                )

                with open(sentiment_file, 'w', encoding='utf-8') as f:
                    json.dump(sentiment_result, f, indent=2, ensure_ascii=False)

                print(f"✅ Enhanced sentiment analysis saved to: {sentiment_file}")

                result['sentiment_analysis'] = {
                    'file': sentiment_file,
                    'summary': sentiment_result['sentiment_breakdown_5class'],
                    'overall_sentiment': sentiment_result['overall_sentiment'],
                    'dominant_emotion': sentiment_result.get('emotion_breakdown', {}),
                    'confidence_breakdown': sentiment_result.get('confidence_breakdown', {}),
                    'ai_summary': sentiment_result.get('ai_summary', {}),
                    'top_comments': sentiment_result.get('top_comments', {}),
                    'total_analyzed': sentiment_result.get('total_comments_analyzed', 0)
                }
            else:
                print("⚠️ Enhanced sentiment analysis failed")

        except Exception as e:
            print(f"⚠️ Enhanced sentiment analysis error: {e}")
            traceback.print_exc()

        timestamp = int(datetime.now().timestamp())
        reddit_file = f"pre-process/reddit_{query.replace(' ', '_')}_{timestamp}.json"
        with open(reddit_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Saved Reddit data: {reddit_file}")
        print(f"   Comments: {result['metadata']['totalComments']:,}")
        print(f"   Posts: {result['metadata']['totalPosts']:,}")
        print(f"   File size: {os.path.getsize(reddit_file) / 1024:.1f} KB\n")

        print("✅ Enhanced sentiment analysis completed\n")
        return jsonify(result)

    except Exception as e:
        print(f"\n❌ Error in /api/reddit/fetch-mass-comments:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/sentiment/latest", methods=["GET"])
def get_latest_sentiment():
    try:
        enhanced_files = glob.glob("pre-process_sentiments/enhanced_sentiment_*.json")
        if enhanced_files:
            latest_file = max(enhanced_files, key=os.path.getctime)
        else:
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
    try:
        reddit_files = glob.glob("pre-process/reddit_*.json")
        sentiment_files = glob.glob("pre-process_sentiments/enhanced_sentiment_*.json")

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
    return jsonify({
        "status": "ok",
        "service": "Reddit Feedback Analyzer + Gemini Chat",
        "version": "4.2-optimized",
        "accounts": len(fetcher.accounts),
        "gemini_api_keys": len(gemini_generator.models) if gemini_generator else 0,
        "active_sessions": len(chat_sessions),
        "features": {
            "multi_account": True,
            "relevance_filtering": True,
            "sentiment_analysis": sentiment_analyzer is not None,
            "gemini_chat": gemini_generator is not None,
            "session_management": True,
            "api_key_rotation": True
        }
    })


if __name__ == "__main__":
    print("=" * 80)
    print("🚀 Reddit Feedback Analyzer API v4.2 (Optimized Gemini)")
    print("=" * 80)
    print(f"✅ {len(fetcher.accounts)} Reddit account(s) loaded")
    print(f"✅ Relevance filtering enabled")
    print(f"✅ Ultra-fast mode active")
    if gemini_generator:
        print(f"✅ Gemini Chatbot Ready ({len(gemini_generator.models)} API keys)")
        print(f"✅ Session-based caching enabled")
        print(f"✅ API key rotation active")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-mass-comments - Fetch comments (with filtering)")
    print("  GET  /api/sentiment/latest           - Get latest sentiment analysis")
    print("  GET  /api/reddit/latest              - Get latest Reddit data")
    print("  GET  /api/files/list                 - List all data files")
    print("  POST /api/gemini/chat                - Gemini Q&A Chat (optimized)")
    print("  POST /api/gemini/reset-session       - Reset chat session")
    print("  GET  /health                         - Health check")
    print("=" * 80)
    print("Server starting on http://0.0.0.0:5000\n")

    app.run(host="0.0.0.0", port=5000, debug=True)