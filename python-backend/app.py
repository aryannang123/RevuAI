# app.py - Updated Flask API with mass comment fetching

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

# Initialize sentiment analyzer (lazy loading)
sentiment_analyzer = None

print(f"✓ Initialized with {len(fetcher.accounts)} Reddit account(s)")

def create_sentiment_analysis_from_file(reddit_file_path, query):
    """Create sentiment analysis from saved Reddit JSON file - analyze ALL comments"""
    global sentiment_analyzer
    
    print(f"🧠 Creating sentiment analysis from: {reddit_file_path}")
    
    # Initialize analyzer if needed
    if sentiment_analyzer is None:
        print("🤖 Loading sentiment analyzer...")
        from transformers import pipeline
        import torch
        
        # Use GPU if available, otherwise CPU
        device = 0 if torch.cuda.is_available() else -1
        device_name = "GPU" if device == 0 else "CPU"
        
        print(f"   Using device: {device_name}")
        
        # Use a reliable sentiment model
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=device,
            batch_size=32
        )
    
    # Read Reddit JSON file
    with open(reddit_file_path, 'r', encoding='utf-8') as f:
        reddit_data = json.load(f)
    
    # Get comments from the structure
    comments = reddit_data.get('comments', [])
    
    if not comments:
        raise Exception("No comments found in Reddit data")
    
    print(f"   Analyzing ALL {len(comments)} comments...")
    
    # Analyze sentiment for ALL comments
    sentiments = {'positive': 0, 'negative': 0, 'neutral': 0}
    analyzed_comments = []
    
    # Prepare texts for batch processing
    valid_comments = []
    valid_indices = []
    
    for i, comment in enumerate(comments):
        text = comment.get('text', '')
        if text and len(text.strip()) >= 10:
            # Truncate to 512 chars for the model
            truncated_text = text[:512]
            valid_comments.append(truncated_text)
            valid_indices.append(i)
    
    print(f"   Processing {len(valid_comments)} valid comments in batches...")
    
    # Process in batches
    batch_size = 32
    for batch_start in range(0, len(valid_comments), batch_size):
        if batch_start % (batch_size * 10) == 0:
            progress = (batch_start / len(valid_comments)) * 100
            print(f"   Progress: {batch_start}/{len(valid_comments)} ({progress:.1f}%)")
        
        batch_end = min(batch_start + batch_size, len(valid_comments))
        batch_texts = valid_comments[batch_start:batch_end]
        batch_indices = valid_indices[batch_start:batch_end]
        
        try:
            # Batch prediction
            results = sentiment_analyzer(batch_texts)
            
            for j, result in enumerate(results):
                original_index = batch_indices[j]
                comment = comments[original_index]
                
                # FIXED: Proper label interpretation
                label = result['label'].lower()
                confidence = result['score']
                
                # Map the model's labels correctly
                # cardiffnlp model outputs: 'negative', 'neutral', 'positive'
                if 'positive' in label or label == 'label_2':
                    sentiment = 'positive'
                    compound = confidence
                elif 'negative' in label or label == 'label_0':
                    sentiment = 'negative'
                    compound = -confidence
                else:  # neutral or label_1
                    sentiment = 'neutral'
                    compound = 0.0
                
                sentiments[sentiment] += 1
                
                analyzed_comments.append({
                    'compound': round(compound, 4),
                    'id': comment.get('id', f'comment_{original_index}'),
                    'post_title': comment.get('post_title', ''),
                    'score': comment.get('score', 0),
                    'sentiment': sentiment,
                    'text': batch_texts[j],
                    'confidence': round(confidence, 4)
                })
                
        except Exception as e:
            print(f"   Error in batch: {e}")
            # If batch fails, mark as neutral
            for j in range(len(batch_texts)):
                original_index = batch_indices[j]
                comment = comments[original_index]
                
                analyzed_comments.append({
                    'compound': 0.0,
                    'id': comment.get('id', f'comment_{original_index}'),
                    'post_title': comment.get('post_title', ''),
                    'score': comment.get('score', 0),
                    'sentiment': 'neutral',
                    'text': batch_texts[j],
                    'confidence': 0.0
                })
                sentiments['neutral'] += 1
    
    # Add comments that were too short (mark as neutral)
    short_comment_count = len(comments) - len(valid_comments)
    if short_comment_count > 0:
        sentiments['neutral'] += short_comment_count
        for i, comment in enumerate(comments):
            text = comment.get('text', '')
            if not text or len(text.strip()) < 10:
                analyzed_comments.append({
                    'compound': 0.0,
                    'id': comment.get('id', f'comment_{i}'),
                    'post_title': comment.get('post_title', ''),
                    'score': comment.get('score', 0),
                    'sentiment': 'neutral',
                    'text': text,
                    'confidence': 0.0
                })
    
    # Calculate results
    total = len(analyzed_comments)
    if total == 0:
        raise Exception("No comments could be analyzed")
    
    percentages = {k: (v/total)*100 for k, v in sentiments.items()}
    dominant = max(percentages, key=percentages.get)
    
    # Get top comments by compound score
    top_positive = sorted([c for c in analyzed_comments if c['sentiment'] == 'positive'], 
                         key=lambda x: x['compound'], reverse=True)[:10]
    top_negative = sorted([c for c in analyzed_comments if c['sentiment'] == 'negative'], 
                         key=lambda x: x['compound'])[:10]
    
    # Create sentiment analysis result
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
    
    # Save sentiment file
    sentiment_filename = f"pre-process/sentiment_{query.replace(' ', '_')}_{timestamp}.json"
    with open(sentiment_filename, 'w', encoding='utf-8') as f:
        json.dump(sentiment_result, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Analyzed {total} comments:")
    print(f"   Positive: {sentiments['positive']} ({percentages['positive']:.1f}%)")
    print(f"   Negative: {sentiments['negative']} ({percentages['negative']:.1f}%)")
    print(f"   Neutral: {sentiments['neutral']} ({percentages['neutral']:.1f}%)")
    
    return sentiment_result


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
        
        # Save Reddit data to file first
        reddit_filename = f"pre-process/reddit_{query.replace(' ', '_')}_{int(datetime.now().timestamp())}.json"
        with open(reddit_filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"💾 Reddit data saved: {reddit_filename}")
        
        # Automatically create sentiment analysis file from the saved Reddit file
        try:
            print(f"\n🧠 Creating sentiment analysis...")
            sentiment_result = create_sentiment_analysis_from_file(reddit_filename, query)
            print(f"✅ Sentiment analysis saved: {sentiment_result['filename']}")
        except Exception as e:
            print(f"❌ Sentiment analysis failed: {e}")
        
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
        
        # Initialize analyzer if not already done (lazy loading)
        if sentiment_analyzer is None:
            print("🤖 Initializing sentiment analyzer...")
            sentiment_analyzer = RedditSentimentAnalyzer()
        
        # Analyze the file
        analysis = sentiment_analyzer.analyze_json_file(file_path)
        
        if analysis is None:
            return jsonify({'error': 'Failed to analyze file'}), 500
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/analyze:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/files', methods=['GET'])
def list_analysis_files():
    """List all JSON files available for analysis"""
    try:
        # Get all JSON files in pre-process folder
        json_files = glob.glob('pre-process/*.json')
        
        files_info = []
        for file_path in json_files:
            filename = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)
            
            # Check if analysis already exists
            analysis_file = f'pre-process/analysis_{filename}'
            has_analysis = os.path.exists(analysis_file)
            
            files_info.append({
                'filename': filename,
                'size_bytes': file_size,
                'size_mb': round(file_size / (1024 * 1024), 2),
                'has_analysis': has_analysis,
                'analysis_filename': f'analysis_{filename}' if has_analysis else None
            })
        
        return jsonify({
            'files': files_info,
            'total_files': len(files_info)
        })
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/files:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/analysis/<filename>', methods=['GET'])
def get_existing_analysis(filename):
    """Get existing sentiment analysis results"""
    try:
        analysis_file = f'pre-process/analysis_{filename}'
        
        if not os.path.exists(analysis_file):
            return jsonify({'error': f'Analysis for {filename} not found'}), 404
        
        with open(analysis_file, 'r', encoding='utf-8') as f:
            analysis = json.load(f)
        
        return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/analysis/{filename}:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/get-analysis/<query>', methods=['GET'])
def get_sentiment_analysis(query):
    """Get sentiment analysis for a specific query"""
    try:
        # Find the most recent sentiment file for this query
        query_clean = query.replace(' ', '_').lower()
        sentiment_files = glob.glob(f'pre-process/sentiment_{query_clean}_*.json')
        
        if not sentiment_files:
            # Try case-insensitive search
            all_sentiment_files = glob.glob(f'pre-process/sentiment_*.json')
            matching_files = []
            for file in all_sentiment_files:
                if query_clean in file.lower():
                    matching_files.append(file)
            
            if not matching_files:
                return jsonify({'error': f'No sentiment analysis found for query: {query}'}), 404
            
            sentiment_files = matching_files
        
        # Get the most recent file
        latest_file = max(sentiment_files, key=os.path.getctime)
        
        print(f"📊 Loading sentiment analysis: {latest_file}")
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            analysis = json.load(f)
        
        # Convert new format to old format for compatibility with frontend
        if 'metadata' in analysis:
            # New format - convert to old format for frontend compatibility
            metadata = analysis['metadata']
            compatible_analysis = {
                'filename': metadata['filename'],
                'analyzed_at': metadata['analyzed_at'],
                'query': metadata['query'],
                'total_comments_analyzed': metadata['total_comments_analyzed'],
                'sentiment_breakdown': metadata['sentiment_breakdown'],
                'raw_counts': metadata['raw_counts'],
                'overall_sentiment': metadata['overall_sentiment'],
                'confidence': metadata['confidence'],
                'top_comments': {
                    'most_negative': analysis['summary']['top_negative_comments'][0] if analysis['summary']['top_negative_comments'] else None,
                    'most_positive': analysis['summary']['top_positive_comments'][0] if analysis['summary']['top_positive_comments'] else None
                },
                'all_comments': analysis['comments']  # Include all analyzed comments
            }
            return jsonify(compatible_analysis)
        else:
            # Old format - return as is
            return jsonify(analysis)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/get-analysis/{query}:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/sentiment/analyze-data', methods=['POST'])
def analyze_data():
    """Analyze sentiment of provided data"""
    global sentiment_analyzer
    
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({'error': 'Data is required'}), 400
        
        query = data.get('query', 'search_query')
        comments_data = data['data']
        
        # Initialize analyzer if not already done
        if sentiment_analyzer is None:
            print("🤖 Initializing sentiment analyzer...")
            sentiment_analyzer = RedditSentimentAnalyzer()
        
        # Extract comments
        comments = comments_data.get('comments', [])
        
        if not comments:
            return jsonify({'error': 'No comments found in data'}), 400
        
        # Analyze sentiment for each comment (limit to first 100 for speed)
        sentiments = {'positive': 0, 'negative': 0, 'neutral': 0}
        analyzed_comments = []
        
        for i, comment in enumerate(comments[:100]):
            text = comment.get('text', comment.get('body', ''))
            if not text or len(text.strip()) < 10:
                continue
            
            try:
                # Simple sentiment analysis using transformers
                from transformers import pipeline
                analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
                result = analyzer(text[:512])
                
                label = result[0]['label']
                score = result[0]['score']
                
                sentiments[label] += 1
                
                analyzed_comments.append({
                    'text': text[:200] + '...' if len(text) > 200 else text,
                    'sentiment': label,
                    'confidence': score,
                    'reddit_score': comment.get('score', 0)
                })
                
            except Exception as e:
                continue
        
        # Calculate percentages
        total = sum(sentiments.values())
        if total == 0:
            return jsonify({'error': 'No comments could be analyzed'}), 400
        
        percentages = {k: (v/total)*100 for k, v in sentiments.items()}
        
        # Get top comments
        negative_comments = [c for c in analyzed_comments if c['sentiment'] == 'negative']
        positive_comments = [c for c in analyzed_comments if c['sentiment'] == 'positive']
        
        top_negative = max(negative_comments, key=lambda x: x['confidence']) if negative_comments else None
        top_positive = max(positive_comments, key=lambda x: x['confidence']) if positive_comments else None
        
        # Overall sentiment
        dominant = max(percentages, key=percentages.get)
        
        result = {
            'total_comments': total,
            'sentiment_breakdown': percentages,
            'raw_counts': sentiments,
            'overall_sentiment': dominant,
            'confidence': percentages[dominant],
            'top_negative': top_negative,
            'top_positive': top_positive,
            'query': query
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"\n❌ Error in /api/sentiment/analyze-data:")
        print(f"   {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Reddit Mass Comment Fetcher + Sentiment Analyzer',
        'version': '3.1',
        'accounts': len(fetcher.accounts),
        'sentiment_analyzer_loaded': sentiment_analyzer is not None
    })


if __name__ == '__main__':
    print("=" * 60)
    print("Reddit Mass Comment Fetcher + Sentiment Analyzer v3.1")
    print("=" * 60)
    print(f"Active Accounts: {len(fetcher.accounts)}")
    print("Server starting on http://localhost:5000")
    print("\nEndpoints:")
    print("  POST /api/reddit/fetch-mass-comments - Fetch 10K+ comments + Auto sentiment analysis")
    print("  GET  /api/sentiment/get-analysis/<query> - Get sentiment analysis for query")
    print("  POST /api/sentiment/analyze          - Analyze sentiment of JSON file")
    print("  GET  /api/sentiment/files            - List available JSON files")
    print("  GET  /health                         - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)