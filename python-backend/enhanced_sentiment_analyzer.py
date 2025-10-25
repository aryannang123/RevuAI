#!/usr/bin/env python3
"""
Enhanced Reddit Comment Sentiment Analysis with j-hartmann Emotion Model
Provides detailed sentiment classification: very negative, negative, neutral, positive, very positive
Uses emotion detection to determine sentiment with high accuracy
"""

import json
import os
from datetime import datetime
from transformers import pipeline
import torch
import warnings
from collections import Counter
warnings.filterwarnings("ignore")

# GPU Detection
def get_best_device():
    if torch.cuda.is_available():
        print("✅ Using NVIDIA GPU (CUDA)")
        return 0, "NVIDIA CUDA"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        print("✅ Using Apple GPU (MPS)")
        return "mps", "Apple MPS"
    else:
        print("⚙️ Using CPU")
        return -1, "CPU"

DEVICE, DEVICE_NAME = get_best_device()
MAX_BATCH_SIZE = 16
TRUNCATE_LENGTH = 512

class EnhancedSentimentAnalyzer:
    def __init__(self):
        """Initialize with j-hartmann emotion model for sentiment analysis"""
        print("🤖 Loading Enhanced Sentiment Analysis Model...")
        print(f"🔧 Device: {DEVICE_NAME}")
        print(f"📦 Batch size: {MAX_BATCH_SIZE}")
        
        # j-hartmann emotion model for sentiment analysis
        self.emotion_analyzer = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            device=DEVICE,
            batch_size=MAX_BATCH_SIZE
        )
        
        print("✅ Model loaded successfully!")

    def _emotion_to_sentiment(self, emotion, confidence):
        """
        Map j-hartmann emotions to detailed sentiment categories
        """
        emotion_lower = emotion.lower()
        
        # Very Positive emotions
        if emotion_lower in ['joy', 'love', 'optimism'] and confidence >= 0.7:
            return 'very_positive', confidence
        elif emotion_lower in ['joy', 'love', 'optimism'] and confidence >= 0.5:
            return 'positive', confidence
            
        # Very Negative emotions  
        elif emotion_lower in ['anger', 'disgust'] and confidence >= 0.7:
            return 'very_negative', -confidence
        elif emotion_lower in ['sadness', 'fear', 'pessimism'] and confidence >= 0.7:
            return 'very_negative', -confidence
            
        # Negative emotions
        elif emotion_lower in ['anger', 'disgust', 'sadness', 'fear'] and confidence >= 0.5:
            return 'negative', -confidence
            
        # Neutral/ambiguous
        else:
            return 'neutral', 0.0



    def analyze_comments_batch(self, comments_data):
        """Analyze comments with detailed sentiment classification"""
        print(f"🚀 Starting enhanced sentiment analysis...")
        
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
        
        print(f"📊 Processing {len(texts)} comments...")
        analyzed_comments = []
        
        try:
            # Run emotion analysis with j-hartmann model
            print("😊 Running emotion analysis (j-hartmann)...")
            emotion_results = self.emotion_analyzer(texts)
            
            for i, (emotion_result, meta) in enumerate(zip(emotion_results, metadata)):
                # Classification from emotion model
                emotion_sentiment, emotion_confidence = self._emotion_to_sentiment(
                    emotion_result['label'], 
                    emotion_result['score']
                )
                
                # Use emotion model result directly
                final_sentiment = emotion_sentiment
                final_confidence = abs(emotion_confidence)
                
                result = {
                    'id': meta['id'],
                    'text': texts[i],
                    'score': meta['reddit_score'],
                    'post_title': meta['post_title'],
                    'sentiment': final_sentiment,
                    'confidence': round(final_confidence, 4),
                    'emotion': {
                        'primary': emotion_result['label'],
                        'confidence': round(emotion_result['score'], 4)
                    }
                }
                
                analyzed_comments.append(result)
            
            print(f"✅ Enhanced analysis complete! Processed {len(analyzed_comments)} comments")
            return analyzed_comments
            
        except Exception as e:
            import traceback
            print(f"🚨 Error in enhanced analysis: {str(e)}")
            print(traceback.format_exc())
            return []

    def analyze_json_file(self, file_path):
        """Analyze all comments in a JSON file with enhanced sentiment"""
        print(f"\n{'='*60}")
        print(f"📊 Enhanced Analysis: {os.path.basename(file_path)}")
        print(f"{'='*60}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'comments' in data:
                comments = data['comments']
            else:
                print("❌ No 'comments' key found in JSON")
                return None
                
            print(f"📝 Found {len(comments)} total comments")
            if not comments:
                print("⚠️ No comments to analyze")
                return None
            
            analyzed_comments = self.analyze_comments_batch(comments)
            if not analyzed_comments:
                print("❌ No comments were successfully analyzed")
                return None
            
            # Calculate detailed statistics
            total_analyzed = len(analyzed_comments)
            sentiment_counts = Counter(c['sentiment'] for c in analyzed_comments)
            emotion_counts = Counter(c['emotion']['primary'] for c in analyzed_comments)
            
            # 5-class sentiment breakdown
            sentiment_percentages = {
                'very_positive': (sentiment_counts.get('very_positive', 0) / total_analyzed) * 100,
                'positive': (sentiment_counts.get('positive', 0) / total_analyzed) * 100,
                'neutral': (sentiment_counts.get('neutral', 0) / total_analyzed) * 100,
                'negative': (sentiment_counts.get('negative', 0) / total_analyzed) * 100,
                'very_negative': (sentiment_counts.get('very_negative', 0) / total_analyzed) * 100
            }
            
            emotion_percentages = {k: (v/total_analyzed)*100 for k, v in emotion_counts.items()}
            
            # Get top comments by category
            top_very_positive = sorted(
                [c for c in analyzed_comments if c['sentiment'] == 'very_positive'], 
                key=lambda x: x['confidence'], reverse=True
            )[:5]
            
            top_very_negative = sorted(
                [c for c in analyzed_comments if c['sentiment'] == 'very_negative'], 
                key=lambda x: x['confidence'], reverse=True
            )[:5]
            
            # Determine overall sentiment
            dominant_sentiment = max(sentiment_percentages, key=sentiment_percentages.get)
            
            analysis_result = {
                'filename': os.path.basename(file_path),
                'analyzed_at': datetime.now().isoformat(),
                'query': data.get('metadata', {}).get('query', 'unknown'),
                'total_comments_analyzed': total_analyzed,
                'model_used': 'j-hartmann/emotion-english-distilroberta-base',
                'sentiment_breakdown_5class': sentiment_percentages,
                'emotion_breakdown': emotion_percentages,
                'raw_counts': {
                    'sentiment': dict(sentiment_counts),
                    'emotion': dict(emotion_counts)
                },
                'overall_sentiment': dominant_sentiment,
                'confidence': round(sentiment_percentages[dominant_sentiment], 2),
                'top_comments': {
                    'most_very_positive': top_very_positive[0] if top_very_positive else None,
                    'most_very_negative': top_very_negative[0] if top_very_negative else None,
                    'top_very_positive_5': top_very_positive,
                    'top_very_negative_5': top_very_negative
                },
                'all_comments': analyzed_comments
            }
            
            # Generate AI summary using Gemini
            print(f"🤖 Generating AI summary with Gemini...")
            try:
                from ai_summary_generator import AISummaryGenerator
                ai_generator = AISummaryGenerator()
                
                # Prepare data for AI summary (convert to expected format)
                summary_data = {
                    'metadata': {
                        'total_comments_analyzed': total_analyzed,
                        'sentiment_breakdown': {
                            'positive': sentiment_percentages['very_positive'] + sentiment_percentages['positive'],
                            'negative': sentiment_percentages['very_negative'] + sentiment_percentages['negative'],
                            'neutral': sentiment_percentages['neutral']
                        },
                        'overall_sentiment': dominant_sentiment,
                        'raw_counts': dict(sentiment_counts)
                    },
                    'summary': {
                        'top_positive_comments': top_very_positive,
                        'top_negative_comments': top_very_negative
                    }
                }
                
                ai_summary = ai_generator.generate_paragraph_summary(summary_data, analysis_result['query'])
                analysis_result['ai_summary'] = ai_summary
                print(f"✅ AI summary generated successfully!")
                
            except Exception as e:
                print(f"⚠️ AI summary generation failed: {e}")
                analysis_result['ai_summary'] = {
                    'paragraph_summary': f"Analysis of {total_analyzed} comments about '{analysis_result['query']}' shows {dominant_sentiment.replace('_', ' ')} sentiment overall.",
                    'generated_at': datetime.now().isoformat(),
                    'model_used': 'fallback',
                    'error': str(e)
                }
            
            # Print detailed summary
            print(f"\n{'='*60}")
            print(f"✅ Enhanced Analysis Complete!")
            print(f"{'='*60}")
            print(f"📊 Comments analyzed: {total_analyzed}")
            print(f"🎭 Overall sentiment: {dominant_sentiment.upper().replace('_', ' ')} ({sentiment_percentages[dominant_sentiment]:.1f}%)")
            print(f"\n📈 Detailed Breakdown:")
            print(f"   Very Positive: {sentiment_counts.get('very_positive', 0):,} ({sentiment_percentages['very_positive']:.1f}%)")
            print(f"   Positive:      {sentiment_counts.get('positive', 0):,} ({sentiment_percentages['positive']:.1f}%)")
            print(f"   Neutral:       {sentiment_counts.get('neutral', 0):,} ({sentiment_percentages['neutral']:.1f}%)")
            print(f"   Negative:      {sentiment_counts.get('negative', 0):,} ({sentiment_percentages['negative']:.1f}%)")
            print(f"   Very Negative: {sentiment_counts.get('very_negative', 0):,} ({sentiment_percentages['very_negative']:.1f}%)")
            
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
        print(f"🔍 Enhanced Sentiment Analysis - Scanning: {directory_path}")
        print(f"{'='*60}\n")
        
        if not os.path.exists(directory_path):
            print(f"❌ Directory not found: {directory_path}")
            return {}
        
        json_files = [f for f in os.listdir(directory_path) 
                     if f.endswith('.json') and f.startswith('reddit_') 
                     and not f.startswith('sentiment_')]
        
        print(f"📁 Found {len(json_files)} Reddit JSON files to analyze\n")
        
        all_analyses = {}
        
        for idx, json_file in enumerate(json_files, 1):
            print(f"\n[{idx}/{len(json_files)}] Processing: {json_file}")
            file_path = os.path.join(directory_path, json_file)
            analysis = self.analyze_json_file(file_path)
            
            if analysis:
                all_analyses[json_file] = analysis
                output_file = os.path.join(directory_path, f"enhanced_sentiment_{json_file}")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(analysis, f, indent=2, ensure_ascii=False)
                print(f"💾 Saved enhanced analysis to: {output_file}")
            else:
                print(f"❌ Failed to analyze {json_file}")
        
        if all_analyses:
            combined_output = os.path.join(directory_path, "combined_enhanced_sentiment_analysis.json")
            with open(combined_output, 'w', encoding='utf-8') as f:
                json.dump(all_analyses, f, indent=2, ensure_ascii=False)
            print(f"\n🎉 Combined enhanced results saved to: {combined_output}")
        
        return all_analyses


def main():
    """Main function to run enhanced sentiment analysis"""
    print("\n" + "="*60)
    print("🚀 Enhanced Reddit Sentiment Analysis - Emotion-Based Classification")
    print("="*60 + "\n")
    
    analyzer = EnhancedSentimentAnalyzer()
    results = analyzer.analyze_all_files()
    
    if results:
        print("\n" + "="*60)
        print("📈 ENHANCED SENTIMENT ANALYSIS REPORT")
        print("="*60 + "\n")
        
        total_comments = sum(r['total_comments_analyzed'] for r in results.values())
        print(f"📊 Total comments analyzed: {total_comments:,}\n")
        
        for filename, analysis in results.items():
            print(f"📄 {filename}")
            print(f"   ├─ Comments: {analysis['total_comments_analyzed']:,}")
            print(f"   ├─ Overall: {analysis['overall_sentiment'].upper().replace('_', ' ')} ({analysis['confidence']:.1f}%)")
            
            sentiment = analysis['sentiment_breakdown_5class']
            print(f"   └─ 5-Class: VP:{sentiment['very_positive']:.1f}% | P:{sentiment['positive']:.1f}% | N:{sentiment['neutral']:.1f}% | N:{sentiment['negative']:.1f}% | VN:{sentiment['very_negative']:.1f}%\n")
    else:
        print("\n⚠️ No files were successfully analyzed")


if __name__ == "__main__":
    main()