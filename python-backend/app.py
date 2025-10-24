# app.py - Fixed Flask API with proper sentiment analysis

from flask import Flask, request, jsonify
from flask_cors import CORS
from reddit_fetcher import MultiAccountRedditFetcher
from sentiment_analyzer import RedditSentimentAnalyzer
import traceback
from dotenv import load_dotenv
import os
import json
import glob
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Reddit fetcher with multiple accounts
def load_accounts():
    """Load multiple Reddit accounts from environment"""
    accounts = []
    
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

# Initialize sentiment analyzer (lazy loading)
sentiment_analyzer = None

print(f"✓ Initialized with {len(fetcher.accounts)} Reddit account(s)")

def create_sentiment_analysis_from_file(reddit_file_path, query):
    """Create sentiment analysis with AI summary from Reddit JSON file"""
    global sentiment_analyzer
    
    print(f"🧠 Analyzing sentiment with AI summary: {reddit_file_path}")
    
    # Read Reddit JSON file
    with open(reddit_file_path, 'r', encoding='utf-8') as f:
        reddit_data = json.load(f)
    
    comments = reddit_data.get('comments', [])
    if not comments:
        raise Exception("No comments found in Reddit data")
    
    print(f"   Processing {len(comments)} comments...")
    
    # Analyze sentiment
    analyzed_comments = []
    sentiments = {'positive': 0, 'negative': 0, 'neutral': 0}
    
    # Process in batches
    for i in range(0, len(comments), 32):
        batch = comments[i:i+32]
        batch_texts = [c.get('text', '')[:512] for c in batch if c.get('text', '')]
        
        if batch_texts:
            results = sentiment_analyzer(batch_texts)
            
            for j, result in enumerate(results):
                if i + j < len(comments):
                    comment = comments[i + j]
                    label = result['label'].lower()
                    confidence = result['score']
                    
                    if 'positive' in label:
                        sentiment = 'positive'
                        compound = confidence
                    elif 'negative' in label:
                        sentiment = 'negative'
                        compound = -confidence
                    else:
                        sentiment = 'neutral'
                        compound = 0.0
                    
                    sentiments[sentiment] += 1
                    
                    analyzed_comments.append({
                        'compound': round(compound, 4),
                        'id': comment.get('id', f'comment_{i+j}'),
                        'post_title': comment.get('post_title', ''),
                        'score': comment.get('score', 0),
                        'sentiment': sentiment,
                        'text': batch_texts[j] if j < len(batch_texts) else '',
                        'confidence': round(confidence, 4)
                    })
    
    # Calculate results
    total = len(analyzed_comments)
    if total == 0:
        raise Exception("No comments could be analyzed")
    
    percentages = {k: (v/total)*100 for k, v in sentiments.items()}
    dominant = max(percentages, key=percentages.get)
    
    # Get top comments
    top_positive = sorted([c for c in analyzed_comments if c['sentiment'] == 'positive'], 
                         key=lambda x: x['compound'], reverse=True)[:10]
    top_negative = sorted([c for c in analyzed_comments if c['sentiment'] == 'negative'], 
                         key=lambda x: x['compound'])[:10]
    
    # Create sentiment result
    timestamp = int(datetime.now().timestamp())
    sentiment_result = {
        'metadata': {
            'filename': f"sentiment_{query.replace(' ', '_')}_{timestamp}.json",
            'analyzed_at': datetime.now().isoformat(),
            'query': query,
            'source_reddit_file': os.path.basename(reddit_file_path),
            'total_comments_analyzed': total,
            'sentiment_breakdown': percentages,
            'raw_counts': sentiments,
            'overall_sentiment': dominant,
            'confidence': percentages[dominant]
        },
        'summary': {
            'top_positive_comments': top_positive,
            'top_negative_comments': top_negative
        },
        'comments': analyzed_comments
    }
    
    # Generate AI paragraph summary
    try:
        print("🧠 Generating AI paragraph summary...")
        from ai_summary_generator import AISummaryGenerator
        
        ai_generator = AISummaryGenerator()
        ai_summary = ai_generator.generate_paragraph_summary(sentiment_result, query)
        
        # Add AI summary to results
        sentiment_result['ai_paragraph_summary'] = ai_summary
        print(f"✅ AI summary generated using {ai_summary['model_used']}")
        
    except ImportError as e:
        print(f"⚠️ AI summary generation failed: {e}")
        print("💡 Install Google Generative AI: pip install google-generativeai")
        # Add fallback summary
        sentiment_result['ai_paragraph_summary'] = {
            'paragraph_summary': f"Analysis of {total} Reddit comments about {query} shows {dominant} sentiment ({percentages[dominant]:.1f}%). The community discussion provides valuable insights into user opinions and experiences.",
            'generated_at': datetime.now().isoformat(),
            'model_used': 'fallback_no_gemini',
            'confidence_level': 'low',
            'analysis_method': 'basic_template'
        }
    except Exception as e:
        print(f"⚠️ AI summary generation failed: {e}")
        # Add fallback summary
        sentiment_result['ai_paragraph_summary'] = {
            'paragraph_summary': f"Analysis of {total} Reddit comments about {query} shows {dominant} sentiment ({percentages[dominant]:.1f}%). The community discussion provides valuable insights into user opinions and experiences.",
            'generated_at': datetime.now().isoformat(),
            'model_used': 'fallback_error',
            'confidence_level': 'low',
            'analysis_method': 'basic_template'
        }
    
    # Save sentiment file with AI summary
    sentiment_filename = f"pre-process/sentiment_{query.replace(' ', '_')}_{timestamp}.json"
    with open(sentiment_filename, 'w', encoding='utf-8') as f:
        json.dump(sentiment_result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Sentiment analysis with AI summary saved: {sentiment_filename}")
    print(f"   Positive: {sentiments['positive']} ({percentages['positive']:.1f}%)")
    print(f"   Negative: {sentiments['negative']} ({percentages['negative']:.1f}%)")
    print(f"   Neutral: {sentiments['neutral']} ({percentages['neutral']:.1f}%)")
    
    return sentiment_result


@app.route('/api/reddit/fetch-mass-comments', methods=['POST'])
def fetch_mass_comments():
    """
    Fetch 10K+ lightweight comments and auto-analyze sentiment
    
    JSON body:
        - query: Search query (required)
        - target_comments: Target number (default: 10000)
        - min_score: Minimum comment score (default: 5)
    """
    global sentiment_analyzer
    
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

        # Fetch comments from Reddit
        result = fetcher.fetch_mass_comments(
            query=query,
            target_comments=target_comments,
            min_score=min_score,
            progress_callback=progress_callback
        )

        print(f"\n✅ Fetch completed:")
        print(f"   Comments: {result['metadata']['totalComments']}")
        print(f"   Time: {result['metadata']['fetchTime']}s")
        
        # Save Reddit data to file
        timestamp = int(datetime.now().timestamp())
        reddit_filename = f"pre-process/reddit_{query.replace(' ', '_')}_{timestamp}.json"
        
        os.makedirs('pre-process', exist_ok=True)
        
        with open(reddit_filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"💾 Reddit data saved: {reddit_filename}")
        
        # Automatically analyze sentiment with AI summary
        try:
            print(f"\n🧠 Starting sentiment analysis with AI summary...")
            
            # Initialize basic analyzer if needed
            if sentiment_analyzer is None:
                print("🤖 Loading sentiment analyzer...")
                from transformers import pipeline
                import torch
                device = 0 if torch.cuda.is_available() else -1
                sentiment_analyzer = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    device=device,
                    batch_size=32
                )
            
            # Perform sentiment analysis
            sentiment_result = create_sentiment_analysis_from_file(reddit_filename, query)
            
            if sentiment_result:
                print(f"✅ Sentiment analysis with AI summary completed!")
            else:
                print(f"❌ Sentiment analysis failed")
                
        except Exception as e:
            print(f"❌ Sentiment analysis error: {e}")
            traceback.print_exc()
        
        print(f"{'='*60}\n")

        return jsonify(result)

    except Exception as e:
        print(f"\n❌ Error in /api/reddit/fetch-mass-comments:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    """
    Analyze sentiment of a specific JSON file
    
    JSON body:
        - filename: Name of JSON file in pre-process folder (required)
    """
    global sentiment_analyzer
    
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        file_path = os.path.join('pre-process', filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'File {filename} not found'}), 404
        
        # Initialize analyzer if not already done
        if sentiment_analyzer is None:
            print("🤖 Initializing sentiment analyzer...")
            sentiment_analyzer = RedditSentimentAnalyzer()
        
        # Analyze the file
        analysis = sentiment_analyzer.analyze_json_file(file_path)
        
        if analysis is None:
            return jsonify({'error': 'Failed to analyze file'}), 500
        
        # Save analysis
        output_file = os.path.join('pre-process', f"sentiment_{filename}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/analyze:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/files', methods=['GET'])
def list_analysis_files():
    """List all JSON files available for analysis"""
    try:
        os.makedirs('pre-process', exist_ok=True)
        
        # Get all JSON files
        all_files = glob.glob('pre-process/*.json')
        
        files_info = []
        for file_path in all_files:
            filename = os.path.basename(file_path)
            
            # Skip analysis files
            if filename.startswith('sentiment_') or filename.startswith('analysis_'):
                continue
            
            file_size = os.path.getsize(file_path)
            
            # Check if analysis exists
            sentiment_file = f'pre-process/sentiment_{filename}'
            has_analysis = os.path.exists(sentiment_file)
            
            files_info.append({
                'filename': filename,
                'size_bytes': file_size,
                'size_mb': round(file_size / (1024 * 1024), 2),
                'has_analysis': has_analysis,
                'sentiment_filename': f'sentiment_{filename}' if has_analysis else None
            })
        
        return jsonify({
            'files': files_info,
            'total_files': len(files_info)
        })
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/files:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/get-analysis/<query>', methods=['GET'])
def get_sentiment_analysis(query):
    """Get sentiment analysis for a specific query"""
    try:
        # Find the most recent sentiment file for this query
        query_clean = query.replace(' ', '_').lower()
        sentiment_files = glob.glob(f'pre-process/sentiment_*{query_clean}*.json')
        
        if not sentiment_files:
            return jsonify({'error': f'No sentiment analysis found for query: {query}'}), 404
        
        # Get the most recent file
        latest_file = max(sentiment_files, key=os.path.getctime)
        
        print(f"📊 Loading sentiment analysis: {latest_file}")
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            analysis = json.load(f)
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/get-analysis/{query}:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/reanalyze/<query>', methods=['POST'])
def reanalyze_query(query):
    """Re-analyze sentiment for existing Reddit data"""
    global sentiment_analyzer
    
    try:
        # Find the most recent Reddit file for this query
        query_clean = query.replace(' ', '_').lower()
        reddit_files = glob.glob(f'pre-process/reddit_*{query_clean}*.json')
        
        if not reddit_files:
            return jsonify({'error': f'No Reddit data found for query: {query}'}), 404
        
        # Get the most recent file
        latest_file = max(reddit_files, key=os.path.getctime)
        
        print(f"🔄 Re-analyzing: {latest_file}")
        
        # Initialize analyzer if needed
        if sentiment_analyzer is None:
            print("🤖 Loading sentiment analyzer...")
            sentiment_analyzer = RedditSentimentAnalyzer()
        
        # Analyze
        analysis = sentiment_analyzer.analyze_json_file(latest_file)
        
        if not analysis:
            return jsonify({'error': 'Failed to analyze file'}), 500
        
        # Save new analysis
        timestamp = int(datetime.now().timestamp())
        sentiment_filename = f"pre-process/sentiment_{query_clean}_{timestamp}.json"
        with open(sentiment_filename, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        print(f"✅ New sentiment analysis saved: {sentiment_filename}")
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/reanalyze/{query}:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Reddit Mass Comment Fetcher + Sentiment Analyzer',
        'version': '4.0',
        'accounts': len(fetcher.accounts),
        'sentiment_analyzer_loaded': sentiment_analyzer is not None
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Reddit Mass Comment Fetcher + Sentiment Analyzer v4.0")
    print("=" * 60)
    print(f"Active Accounts: {len(fetcher.accounts)}")
    print("Server starting on http://localhost:5000")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-mass-comments    - Fetch + Auto analyze")
    print("  GET  /api/sentiment/get-analysis/<query> - Get sentiment results")
    print("  POST /api/sentiment/analyze             - Analyze specific file")
    print("  POST /api/sentiment/reanalyze/<query>   - Re-analyze existing data")
    print("  GET  /api/sentiment/files               - List available files")
    print("  GET  /health                            - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)