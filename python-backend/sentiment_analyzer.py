#!/usr/bin/env python3
"""
Reddit Comment Sentiment Analysis using Hugging Face Models
Analyzes JSON files in pre-process folder for sentiment, emotions, and topics
"""

import json
import os
from datetime import datetime
from transformers import pipeline
import warnings
warnings.filterwarnings("ignore")

class RedditSentimentAnalyzer:
    def __init__(self):
        """Initialize the sentiment analyzer with pre-trained models"""
        print("🤖 Loading Hugging Face models...")
        
        # Best models for different tasks
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            return_all_scores=True
        )
        
        self.emotion_analyzer = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            return_all_scores=True
        )
        
        self.topic_classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli"
        )
        
        # Gaming-specific topics for classification
        self.gaming_topics = [
            "gameplay mechanics",
            "graphics and visuals", 
            "story and narrative",
            "monetization and pricing",
            "bugs and technical issues",
            "multiplayer experience",
            "game updates and patches",
            "character development",
            "world design",
            "performance optimization"
        ]
        
        print("✅ Models loaded successfully!")

        def analyze_json_file(self, file_path):
            """Analyze all comments in a JSON file"""
            print(f"📊 Analyzing: {os.path.basename(file_path)}")
        
        # Initialize results dictionary early to prevent 'NameError'
            analysis_result = {'file_info': {'filename': os.path.basename(file_path), 'analyzed_at': datetime.now().isoformat()}}
        
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                 data = json.load(f)
            
            # --- Comment Extraction Logic (No Change) ---
                if 'comments' in data:
                    comments = data['comments']
                elif 'postsWithComments' in data:
                    comments = [c for post in data['postsWithComments'] for c in post.get('comments', [])]
                else:
                    print("❌ Unknown JSON structure")
                    return None
                
                print(f"📝 Found {len(comments)} total comments to analyze")
            
                analyzed_comments = []
                sentiment_summary = {'POSITIVE': 0, 'NEGATIVE': 0, 'NEUTRAL': 0}
                emotion_summary = {}
                topic_summary = {}
            
            # --- Analysis Loop (No Change) ---
                for i, comment in enumerate(comments):
                # ... (Progress printing and data extraction logic unchanged)
                    if i % 100 == 0:
                        print(f"   Progress: {i}/{len(comments)} ({i/len(comments)*100:.1f}%)")
                
                    text = comment.get('text', comment.get('body', '')) if isinstance(comment, dict) else str(comment)
                    score = comment.get('score', 0) if isinstance(comment, dict) else 0
                
                    analysis = self.analyze_comment(text, score)
                
                    if analysis:
                        analyzed_comments.append(analysis)
                    
                    # Update summaries
                        sentiment = analysis['sentiment']['primary']
                        emotion = analysis['emotion']['primary']
                        topic = analysis['topic']['primary']
                    
                        sentiment_summary[sentiment] = sentiment_summary.get(sentiment, 0) + 1
                        emotion_summary[emotion] = emotion_summary.get(emotion, 0) + 1
                        topic_summary[topic] = topic_summary.get(topic, 0) + 1
            
            # --- Result Aggregation and Final Construction (Crucial Section) ---
                total_analyzed = len(analyzed_comments)
            
                if total_analyzed == 0:
                    print("⚠️ No comments were successfully analyzed. Returning empty result.")
                    return analysis_result 
                
                sentiment_percentages = {k: (v/total_analyzed)*100 for k, v in sentiment_summary.items()}
                emotion_percentages = {k: (v/total_analyzed)*100 for k, v in emotion_summary.items()}
                topic_percentages = {k: (v/total_analyzed)*100 for k, v in topic_summary.items()}

                top_positive = sorted([c for c in analyzed_comments if c['sentiment']['primary'] == 'POSITIVE'], 
                                  key=lambda x: x['sentiment']['confidence'], reverse=True)[:5]
                top_negative = sorted([c for c in analyzed_comments if c['sentiment']['primary'] == 'NEGATIVE'], 
                                  key=lambda x: x['sentiment']['confidence'], reverse=True)[:5]
                high_scoring = sorted([c for c in analyzed_comments if c['reddit_score'] > 100], 
                                  key=lambda x: x['reddit_score'], reverse=True)[:10]
            
            # Define analysis_result with all computed data
                analysis_result.update({
                    'file_info': {
                        'filename': analysis_result['file_info']['filename'], # Keep original filename
                        'analyzed_at': analysis_result['file_info']['analyzed_at'],
                        'total_comments': len(comments),
                        'successfully_analyzed': total_analyzed
                    },
                    'sentiment_analysis': {
                        'summary': sentiment_percentages,
                        'raw_counts': sentiment_summary,
                        'top_positive_comments': top_positive,
                        'top_negative_comments': top_negative
                    },
                # ... (Other sections like emotion_analysis, topic_analysis, and insights remain the same)
                    'emotion_analysis': {
                        'summary': emotion_percentages,
                        'raw_counts': emotion_summary,
                        'dominant_emotions': sorted(emotion_percentages.items(), key=lambda x: x[1], reverse=True)[:3]
                    },
                    'topic_analysis': {
                        'summary': topic_percentages,
                        'raw_counts': topic_summary,
                        'top_topics': sorted(topic_percentages.items(), key=lambda x: x[1], reverse=True)[:5]
                    },
                    'insights': {
                        'overall_sentiment': max(sentiment_percentages, key=sentiment_percentages.get),
                        'sentiment_confidence': max(sentiment_percentages.values()),
                        'dominant_emotion': max(emotion_percentages, key=emotion_percentages.get),
                        'main_topic': max(topic_percentages, key=topic_percentages.get),
                        'high_scoring_comments': high_scoring
                    }
                })
            
                print(f"✅ Analysis complete!")
                print(f"   Sentiment: {analysis_result['insights']['overall_sentiment']} ({analysis_result['insights']['sentiment_confidence']:.1f}%)")
                print(f"   Emotion: {analysis_result['insights']['dominant_emotion']}")
                print(f"   Topic: {analysis_result['insights']['main_topic']}")
            
                return analysis_result
            
            except Exception as e:
            # We already initialized analysis_result, so we can return it partially filled, 
            # or just return None after logging the full error.
                import traceback
                print(f"🚨 FATAL ERROR PROCESSING FILE: {analysis_result['file_info']['filename']}")
                print(f"Error details: {str(e)}")
                print(traceback.format_exc())
                return None


    def analyze_all_files(self, directory_path="pre-process"):
        """Analyze all JSON files in the directory"""
        print(f"🔍 Scanning directory: {directory_path}")
        
        json_files = [f for f in os.listdir(directory_path) if f.endswith('.json')]
        print(f"📁 Found {len(json_files)} JSON files")
        
        all_analyses = {}
        
        for json_file in json_files:
            file_path = os.path.join(directory_path, json_file)
            analysis = self.analyze_json_file(file_path)
            
            if analysis:
                all_analyses[json_file] = analysis
                
                # Save individual analysis
                output_file = os.path.join(directory_path, f"analysis_{json_file}")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(analysis, f, indent=2, ensure_ascii=False)
                print(f"💾 Saved analysis to: {output_file}")
        
        # Save combined analysis
        combined_output = os.path.join(directory_path, "combined_sentiment_analysis.json")
        with open(combined_output, 'w', encoding='utf-8') as f:
            json.dump(all_analyses, f, indent=2, ensure_ascii=False)
        
        print(f"🎉 All analyses complete! Combined results saved to: {combined_output}")
        return all_analyses

def main():
    """Main function to run sentiment analysis"""
    print("🚀 Starting Reddit Sentiment Analysis with Hugging Face")
    print("=" * 60)
    
    analyzer = RedditSentimentAnalyzer()
    results = analyzer.analyze_all_files()
    
    print("\n📈 SUMMARY REPORT")
    print("=" * 60)
    
    for filename, analysis in results.items():
        print(f"\n📄 {filename}")
        print(f"   Comments analyzed: {analysis['file_info']['successfully_analyzed']}")
        print(f"   Overall sentiment: {analysis['insights']['overall_sentiment']} ({analysis['insights']['sentiment_confidence']:.1f}%)")
        print(f"   Dominant emotion: {analysis['insights']['dominant_emotion']}")
        print(f"   Main topic: {analysis['insights']['main_topic']}")
        
        # Show sentiment breakdown
        sentiment = analysis['sentiment_analysis']['summary']
        print(f"   Sentiment breakdown: Positive {sentiment['POSITIVE']:.1f}% | Negative {sentiment['NEGATIVE']:.1f}% | Neutral {sentiment['NEUTRAL']:.1f}%")

if __name__ == "__main__":
    main()