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
    # Add these extensive keyword lists at the top of EnhancedSentimentAnalyzer class

    POSITIVE_KEYWORDS = [
        # Quality & Excellence
        "good", "great", "excellent", "amazing", "awesome", "fantastic", "wonderful", 
        "brilliant", "outstanding", "superb", "exceptional", "perfect", "flawless",
        "impressive", "remarkable", "fabulous", "magnificent", "stellar", "phenomenal",
        
        # Satisfaction & Approval
        "love", "like", "enjoy", "pleased", "satisfied", "happy", "glad", "delighted",
        "thrilled", "excited", "appreciate", "grateful", "thankful", "blessed",
        
        # Recommendation & Value
        "recommend", "worth", "best", "top", "must", "definitely", "absolutely",
        "highly", "strongly", "favorite", "favourite", "premium", "quality",
        
        # Performance & Function
        "fast", "quick", "smooth", "easy", "simple", "reliable", "stable", "efficient",
        "powerful", "robust", "solid", "consistent", "seamless", "flawless",
        
        # Experience & Emotion
        "nice", "beautiful", "gorgeous", "stunning", "elegant", "sleek", "clean",
        "comfortable", "convenient", "helpful", "useful", "handy", "practical",
        
        # Positive Action Verbs
        "works", "fixed", "improved", "upgraded", "enhanced", "solved", "resolved",
        "delivered", "exceeded", "surprised", "impressed", "blown away",
        
        # Colloquial Positive
        "cool", "neat", "dope", "lit", "fire", "sick", "rad", "epic", "legit",
        "clutch", "goat", "based", "w", "poggers", "bussin"
    ]

    NEGATIVE_KEYWORDS = [
        # Quality Issues
        "bad", "poor", "terrible", "awful", "horrible", "worst", "garbage", "trash",
        "crap", "junk", "shit", "sucks", "rubbish", "pathetic", "abysmal", "atrocious",
        
        # Problems & Failures
        "issue", "problem", "bug", "error", "glitch", "crash", "fail", "failure",
        "broken", "defect", "flaw", "fault", "malfunction", "defective",
        
        # Dissatisfaction
        "hate", "dislike", "regret", "disappointed", "disappointing", "frustrating",
        "frustrated", "annoyed", "annoying", "irritated", "irritating", "upset",
        
        # Performance Issues
        "slow", "sluggish", "laggy", "buggy", "unstable", "unreliable", "inconsistent",
        "clunky", "awkward", "confusing", "complicated", "difficult", "hard",
        
        # Negative Experiences
        "waste", "useless", "pointless", "worthless", "overpriced", "expensive",
        "scam", "ripoff", "rip off", "fraud", "misleading", "deceptive",
        
        # Damage & Loss
        "damage", "damaged", "destroyed", "ruined", "wasted", "lost", "missing",
        "died", "dead", "killed", "fried", "bricked",
        
        # Negative Actions
        "avoid", "skip", "return", "returned", "refund", "refunded", "cancelled",
        "uninstalled", "deleted", "removed", "stopped", "quit",
        
        # Warnings & Advice Against
        "don't", "dont", "never", "warning", "beware", "careful", "caution",
        "not recommend", "stay away", "steer clear",
        
        # Colloquial Negative
        "mid", "trash", "ass", "garbage", "yikes", "oof", "rip", "l", "cringe"
    ]

    # Context modifiers that strengthen sentiment
    INTENSIFIERS = [
        "very", "extremely", "really", "super", "incredibly", "absolutely", "totally",
        "completely", "utterly", "highly", "so", "too", "exceptionally", "remarkably"
    ]

    # Negation words that flip sentiment
    NEGATIONS = [
        "not", "no", "never", "nothing", "neither", "nowhere", "none", "nobody",
        "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't",
        "doesn't", "don't", "didn't", "won't", "wouldn't", "shouldn't", "couldn't",
        "can't", "cannot"
    ]
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
                
                # ✨ APPLY ADVANCED REBALANCING
                rebalanced_sentiment, rebalanced_confidence = self.rebalance_neutral_advanced(
                    sentiment=emotion_sentiment,
                    emotion_label=emotion_result['label'],
                    text=texts[i],
                    conf_sent=abs(emotion_confidence),
                    conf_emo=emotion_result['score']
                )
                
                final_sentiment = rebalanced_sentiment
                final_confidence = rebalanced_confidence
                
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
        
    def rebalance_neutral_advanced(self, sentiment, emotion_label, text, conf_sent, conf_emo):
        """
        Advanced neutral rebalancing with keyword analysis and context awareness
        """
        text_lower = text.lower()
        words = text_lower.split()
        
        # Check for negations near keywords
        def has_negation_nearby(index, window=3):
            start = max(0, index - window)
            nearby_words = words[start:index]
            return any(neg in nearby_words for neg in self.NEGATIONS)
        
        # Count positive/negative keywords with negation awareness
        positive_score = 0
        negative_score = 0
        
        for i, word in enumerate(words):
            is_negated = has_negation_nearby(i)
            
            if word in self.POSITIVE_KEYWORDS:
                if is_negated:
                    negative_score += 1  # "not good" becomes negative
                else:
                    positive_score += 1
            
            if word in self.NEGATIVE_KEYWORDS:
                if is_negated:
                    positive_score += 1  # "not bad" becomes positive
                else:
                    negative_score += 1
        
        # Check for intensifiers
        has_intensifier = any(intensifier in text_lower for intensifier in self.INTENSIFIERS)
        
        # RULE 1: Both sentiment and emotion are neutral
        if sentiment == "neutral" and emotion_label in ["neutral", "surprise"]:
            if positive_score > negative_score:
                if positive_score >= 3 or has_intensifier:
                    return "positive", 0.65
                elif positive_score >= 2:
                    return "positive", 0.55
            elif negative_score > positive_score:
                if negative_score >= 3 or has_intensifier:
                    return "negative", 0.65
                elif negative_score >= 2:
                    return "negative", 0.55
        
        # RULE 2: Sentiment is neutral but emotion is strong
        if sentiment == "neutral" and conf_emo > 0.5:
            if emotion_label in ["joy", "love", "optimism"]:
                if positive_score > 0:
                    return "positive", conf_emo * 0.9
                else:
                    return "positive", conf_emo * 0.7
            
            if emotion_label in ["anger", "sadness", "disgust", "fear"]:
                if negative_score > 0:
                    return "negative", conf_emo * 0.9
                else:
                    return "negative", conf_emo * 0.7
        
        # RULE 3: Override weak sentiment if keywords strongly disagree
        if sentiment in ["positive", "very_positive"] and conf_sent < 0.6:
            if negative_score > positive_score + 2:
                return "negative", 0.6
        
        if sentiment in ["negative", "very_negative"] and conf_sent < 0.6:
            if positive_score > negative_score + 2:
                return "positive", 0.6
        
        # RULE 4: Upgrade sentiment strength if many keywords present
        if sentiment == "positive" and positive_score >= 3:
            return "very_positive", min(conf_sent + 0.15, 0.95)
        
        if sentiment == "negative" and negative_score >= 3:
            return "very_negative", min(conf_sent + 0.15, 0.95)
        
        return sentiment, conf_sent

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
            
            # Confidence breakdown (10 bins from 0.0-1.0) - Using Emotion Confidence
            confidence_bins = {
                '0.0-0.1': 0, '0.1-0.2': 0, '0.2-0.3': 0, '0.3-0.4': 0, '0.4-0.5': 0,
                '0.5-0.6': 0, '0.6-0.7': 0, '0.7-0.8': 0, '0.8-0.9': 0, '0.9-1.0': 0
            }
            
            for comment in analyzed_comments:
                # Use emotion confidence for the confidence breakdown
                emotion_confidence = comment['emotion']['confidence']
                bin_index = min(int(emotion_confidence * 10), 9)  # Ensure max index is 9
                bin_keys = list(confidence_bins.keys())
                confidence_bins[bin_keys[bin_index]] += 1
            
            # Convert confidence counts to percentages
            confidence_percentages = {k: (v/total_analyzed)*100 for k, v in confidence_bins.items()}
            
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
                'confidence_breakdown': confidence_percentages,
                'raw_counts': {
                    'sentiment': dict(sentiment_counts),
                    'emotion': dict(emotion_counts),
                    'confidence': dict(confidence_bins)
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
            
            # Generate AI summary and developer suggestions using Gemini
            print(f"🤖 Generating AI summary and developer suggestions with Gemini...")
            try:
                from ai_summary_generator import AISummaryGenerator
                ai_generator = AISummaryGenerator()
                
                # Prepare data for AI analysis (convert to expected format)
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
                
                # Generate combined AI analysis (summary + developer suggestions in one call)
                combined_analysis = ai_generator.generate_combined_analysis(summary_data, analysis_result['query'])
                analysis_result['ai_summary'] = combined_analysis['ai_summary']
                analysis_result['developer_suggestions'] = combined_analysis['developer_suggestions']
                print(f"✅ Combined AI analysis generated successfully (1 API call instead of 2)!")
                
            except Exception as e:
                print(f"⚠️ AI analysis generation failed: {e}")
                analysis_result['ai_summary'] = {
                    'paragraph_summary': f"Analysis of {total_analyzed} comments about '{analysis_result['query']}' shows {dominant_sentiment.replace('_', ' ')} sentiment overall.",
                    'generated_at': datetime.now().isoformat(),
                    'model_used': 'fallback',
                    'error': str(e)
                }
                analysis_result['developer_suggestions'] = {
                    'developer_suggestions': f"Based on negative feedback analysis, consider addressing user concerns about {analysis_result['query']}.",
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
            
            # Show emotion confidence distribution summary
            high_confidence = confidence_percentages.get('0.8-0.9', 0) + confidence_percentages.get('0.9-1.0', 0)
            medium_confidence = confidence_percentages.get('0.6-0.7', 0) + confidence_percentages.get('0.7-0.8', 0)
            low_confidence = sum(confidence_percentages.get(k, 0) for k in ['0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6'])
            
            print(f"\n📊 Emotion Confidence Distribution:")
            print(f"   High (0.8-1.0):   {high_confidence:.1f}%")
            print(f"   Medium (0.6-0.8): {medium_confidence:.1f}%") 
            print(f"   Low (0.0-0.6):    {low_confidence:.1f}%")
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