#!/usr/bin/env python3
"""
Fixed Reddit Comment Sentiment Analysis with GPU Acceleration
Optimized for speed and accuracy with universal GPU detection
"""

import json
import os
from datetime import datetime
from transformers import pipeline
import torch
import warnings
from collections import Counter
warnings.filterwarnings("ignore")

# ==============================================================
# 🌍 UNIVERSAL GPU AUTO-DETECTION (CUDA / MPS / DirectML / CPU)
# ==============================================================

def get_best_device():
    try:
        # 1️⃣ CUDA (NVIDIA)
        if torch.cuda.is_available():
            print("✅ Using NVIDIA GPU (CUDA)")
            return "cuda", "NVIDIA CUDA"

        # 2️⃣ Apple Silicon (MPS)
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            print("✅ Using Apple GPU (MPS)")
            return "mps", "Apple MPS"

        # 3️⃣ DirectML (Intel / AMD / fallback)
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            if "DmlExecutionProvider" in providers:
                print("✅ Using GPU via ONNX Runtime DirectML")
                return "onnxruntime", "DirectML"
        except Exception:
            pass

        # 4️⃣ CPU fallback
        print("⚙️ Using CPU (no GPU found)")
        return "cpu", "CPU"

    except Exception as e:
        print(f"⚠️ Error detecting GPU: {e}")
        return "cpu", "CPU"

# Get and print the best available device
DEVICE, DEVICE_NAME = get_best_device()
MAX_BATCH_SIZE = 16
TRUNCATE_LENGTH = 512


# ==============================================================
# 💬 Reddit Sentiment Analyzer Class (Functionality Unchanged)
# ==============================================================

class RedditSentimentAnalyzer:
    def __init__(self):
        """Initialize the sentiment analyzer with GPU-accelerated models"""
        print("🤖 Loading Hugging Face models with GPU acceleration...")
        print(f"🔧 Device: {DEVICE_NAME} (device={DEVICE})")
        print(f"📦 Batch size: {MAX_BATCH_SIZE}")
        
        # Primary sentiment model (Cardiff NLP - fast and accurate)
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=0 if DEVICE in ["cuda", "mps"] else -1,
            batch_size=MAX_BATCH_SIZE
        )
        
        # Emotion detection (optional, faster model)
        try:
            self.emotion_analyzer = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                device=0 if DEVICE in ["cuda", "mps"] else -1,
                batch_size=MAX_BATCH_SIZE
            )
            self.has_emotion = True
        except Exception as e:
            print(f"⚠️ Emotion analyzer not available: {e}")
            self.has_emotion = False
        
        print("✅ Models loaded successfully!")

    def _map_sentiment_label(self, label, score):
        """
        Map Cardiff NLP model labels to standard sentiment
        Cardiff outputs: negative, neutral, positive (or label_0, label_1, label_2)
        """
        label_lower = label.lower()
        
        if 'positive' in label_lower or label == 'label_2':
            return 'positive', score
        elif 'negative' in label_lower or label == 'label_0':
            return 'negative', -score
        else:
            return 'neutral', 0.0

    def analyze_comments_batch(self, comments_data):
        """Analyze multiple comments in batches for maximum GPU efficiency"""
        print(f"🚀 Starting batch sentiment analysis...")
        
        texts, metadata = [], []
        for i, comment in enumerate(comments_data):
            text = comment.get('text', comment.get('body', '')) if isinstance(comment, dict) else str(comment)
            score = comment.get('score', 0) if isinstance(comment, dict) else 0
            post_title = comment.get('post_title', '') if isinstance(comment, dict) else ''
            comment_id = comment.get('id', f'comment_{i}') if isinstance(comment, dict) else f'comment_{i}'
            
            if text and len(text.strip()) >= 10:
                texts.append(text[:TRUNCATE_LENGTH])
                metadata.append({
                    'id': comment_id,
                    'original_text': text,
                    'reddit_score': score,
                    'post_title': post_title
                })
        
        if not texts:
            print("⚠️ No valid texts to analyze")
            return []
        
        print(f"📊 Processing {len(texts)} comments in batches of {MAX_BATCH_SIZE}")
        analyzed_comments = []
        
        try:
            print("🎭 Running sentiment analysis...")
            sentiment_results = self.sentiment_analyzer(texts)
            
            emotion_results = None
            if self.has_emotion:
                try:
                    print("😊 Running emotion analysis...")
                    emotion_results = self.emotion_analyzer(texts)
                except Exception as e:
                    print(f"⚠️ Emotion analysis failed: {e}")
            
            for i, (sentiment_result, meta) in enumerate(zip(sentiment_results, metadata)):
                label = sentiment_result['label']
                confidence = sentiment_result['score']
                sentiment, compound = self._map_sentiment_label(label, confidence)
                
                result = {
                    'id': meta['id'],
                    'text': texts[i],
                    'score': meta['reddit_score'],
                    'post_title': meta['post_title'],
                    'sentiment': sentiment,
                    'confidence': round(confidence, 4),
                    'compound': round(compound, 4)
                }
                
                if emotion_results and i < len(emotion_results):
                    emotion = emotion_results[i]
                    result['emotion'] = {
                        'primary': emotion['label'],
                        'confidence': round(emotion['score'], 4)
                    }
                
                analyzed_comments.append(result)
            
            print(f"✅ Batch analysis complete! Processed {len(analyzed_comments)} comments")
            return analyzed_comments
            
        except Exception as e:
            import traceback
            print(f"🚨 Error in batch analysis: {str(e)}")
            print(traceback.format_exc())
            return []

    def analyze_json_file(self, file_path):
        """Analyze all comments in a JSON file"""
        print(f"\n{'='*60}")
        print(f"📊 Analyzing: {os.path.basename(file_path)}")
        print(f"{'='*60}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'comments' in data:
                comments = data['comments']
            elif 'postsWithComments' in data:
                comments = [c for post in data['postsWithComments'] for c in post.get('comments', [])]
            else:
                print("❌ Unknown JSON structure - expected 'comments' or 'postsWithComments' key")
                return None
                
            print(f"📝 Found {len(comments)} total comments")
            if not comments:
                print("⚠️ No comments to analyze")
                return None
            
            analyzed_comments = self.analyze_comments_batch(comments)
            if not analyzed_comments:
                print("❌ No comments were successfully analyzed")
                return None
            
            total_analyzed = len(analyzed_comments)
            sentiment_counts = Counter(c['sentiment'] for c in analyzed_comments)
            sentiment_percentages = {
                'positive': (sentiment_counts.get('positive', 0) / total_analyzed) * 100,
                'negative': (sentiment_counts.get('negative', 0) / total_analyzed) * 100,
                'neutral': (sentiment_counts.get('neutral', 0) / total_analyzed) * 100
            }
            
            emotion_counts = {}
            emotion_percentages = {}
            if analyzed_comments and 'emotion' in analyzed_comments[0]:
                emotion_counts = Counter(c['emotion']['primary'] for c in analyzed_comments if 'emotion' in c)
                emotion_percentages = {k: (v/total_analyzed)*100 for k, v in emotion_counts.items()}
            
            top_positive = sorted(
                [c for c in analyzed_comments if c['sentiment'] == 'positive'], 
                key=lambda x: x['confidence'], 
                reverse=True
            )[:10]
            
            top_negative = sorted(
                [c for c in analyzed_comments if c['sentiment'] == 'negative'], 
                key=lambda x: x['confidence'], 
                reverse=True
            )[:10]
            
            high_scoring = sorted(analyzed_comments, key=lambda x: x['score'], reverse=True)[:10]
            
            dominant_sentiment = max(sentiment_percentages, key=sentiment_percentages.get)
            sentiment_confidence = sentiment_percentages[dominant_sentiment]
            
            analysis_result = {
                'filename': os.path.basename(file_path),
                'analyzed_at': datetime.now().isoformat(),
                'query': data.get('metadata', {}).get('query', 'unknown'),
                'total_comments_analyzed': total_analyzed,
                'sentiment_breakdown': sentiment_percentages,
                'raw_counts': dict(sentiment_counts),
                'overall_sentiment': dominant_sentiment,
                'confidence': round(sentiment_confidence, 2),
                'top_comments': {
                    'most_positive': top_positive[0] if top_positive else None,
                    'most_negative': top_negative[0] if top_negative else None,
                    'top_positive_10': top_positive,
                    'top_negative_10': top_negative,
                    'high_scoring': high_scoring
                },
                'all_comments': analyzed_comments
            }
            
            if emotion_counts:
                analysis_result['emotion_analysis'] = {
                    'summary': emotion_percentages,
                    'raw_counts': dict(emotion_counts),
                    'dominant_emotion': max(emotion_percentages, key=emotion_percentages.get)
                }
            
            print(f"\n{'='*60}")
            print(f"✅ Analysis Complete!")
            print(f"{'='*60}")
            print(f"📊 Comments analyzed: {total_analyzed}/{len(comments)}")
            print(f"🎭 Overall sentiment: {dominant_sentiment.upper()} ({sentiment_confidence:.1f}%)")
            print(f"\n📈 Breakdown:")
            print(f"   Positive: {sentiment_counts.get('positive', 0):,} ({sentiment_percentages['positive']:.1f}%)")
            print(f"   Negative: {sentiment_counts.get('negative', 0):,} ({sentiment_percentages['negative']:.1f}%)")
            print(f"   Neutral:  {sentiment_counts.get('neutral', 0):,} ({sentiment_percentages['neutral']:.1f}%)")
            
            if emotion_counts:
                dominant_emotion = max(emotion_percentages, key=emotion_percentages.get)
                print(f"\n😊 Dominant emotion: {dominant_emotion} ({emotion_percentages[dominant_emotion]:.1f}%)")
            
            print(f"{'='*60}\n")
            return analysis_result
            
        except Exception as e:
            import traceback
            print(f"\n🚨 FATAL ERROR:")
            print(f"{'='*60}")
            print(traceback.format_exc())
            print(f"{'='*60}\n")
            return None

    def analyze_all_files(self, directory_path="pre-process"):
        """Analyze all JSON files in the directory"""
        print(f"\n{'='*60}")
        print(f"🔍 Scanning directory: {directory_path}")
        print(f"{'='*60}\n")
        
        if not os.path.exists(directory_path):
            print(f"❌ Directory not found: {directory_path}")
            return {}
        
        json_files = [f for f in os.listdir(directory_path) 
                     if f.endswith('.json') and not f.startswith('analysis_') 
                     and not f.startswith('sentiment_')]
        
        print(f"📁 Found {len(json_files)} JSON files to analyze\n")
        
        all_analyses = {}
        
        for idx, json_file in enumerate(json_files, 1):
            print(f"\n[{idx}/{len(json_files)}] Processing: {json_file}")
            file_path = os.path.join(directory_path, json_file)
            analysis = self.analyze_json_file(file_path)
            
            if analysis:
                all_analyses[json_file] = analysis
                output_file = os.path.join(directory_path, f"sentiment_{json_file}")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(analysis, f, indent=2, ensure_ascii=False)
                print(f"💾 Saved to: {output_file}")
            else:
                print(f"❌ Failed to analyze {json_file}")
        
        if all_analyses:
            combined_output = os.path.join(directory_path, "combined_sentiment_analysis.json")
            with open(combined_output, 'w', encoding='utf-8') as f:
                json.dump(all_analyses, f, indent=2, ensure_ascii=False)
            print(f"\n🎉 Combined results saved to: {combined_output}")
        
        return all_analyses


def main():
    """Main function to run sentiment analysis"""
    print("\n" + "="*60)
    print("🚀 Reddit Sentiment Analysis with Hugging Face")
    print("="*60 + "\n")
    
    analyzer = RedditSentimentAnalyzer()
    results = analyzer.analyze_all_files()
    
    if results:
        print("\n" + "="*60)
        print("📈 FINAL SUMMARY REPORT")
        print("="*60 + "\n")
        
        total_comments = sum(r['total_comments_analyzed'] for r in results.values())
        print(f"📊 Total comments analyzed across all files: {total_comments:,}\n")
        
        for filename, analysis in results.items():
            print(f"📄 {filename}")
            print(f"   ├─ Comments: {analysis['total_comments_analyzed']:,}")
            print(f"   ├─ Sentiment: {analysis['overall_sentiment'].upper()} ({analysis['confidence']:.1f}%)")
            sentiment = analysis['sentiment_breakdown']
            print(f"   └─ Breakdown: ✅ {sentiment['positive']:.1f}% | ❌ {sentiment['negative']:.1f}% | ⚪ {sentiment['neutral']:.1f}%\n")
    else:
        print("\n⚠️ No files were successfully analyzed")


if __name__ == "__main__":
    main()
