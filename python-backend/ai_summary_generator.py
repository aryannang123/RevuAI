#!/usr/bin/env python3
"""
AI Summary Generator using Google Gemini 2.5 Flash
Pure Gemini power - no fallbacks, no BS
"""

import json
import os
from datetime import datetime
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Generative AI not available. Install with: pip install google-generativeai")

# Load environment variables
load_dotenv()

class AISummaryGenerator:
    def __init__(self):
        """Initialize Gemini 2.5 Flash for summary generation"""
        print("🚀 Loading Pure Gemini AI Summary Generator...")
        
        if not GEMINI_AVAILABLE:
            raise ImportError("❌ Google Generative AI package not installed! Run: pip install google-generativeai")
        
        # Get Gemini API key from environment
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key or api_key == 'your_gemini_api_key_here':
            raise ValueError("❌ GEMINI_API_KEY required! Add your API key to .env file.")
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Initialize Gemini 2.5 Flash - the beast
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        print("⚡ Gemini 2.5 Flash loaded - ready to dominate!")
        
        print("✅ Pure Gemini AI Summary Generator ready!")

    def generate_paragraph_summary(self, sentiment_data, query):
        """Generate pure Gemini-powered intelligent summary"""
        print(f"⚡ Gemini 2.5 Flash analyzing sentiment data for: {query}")
        
        # Extract data from sentiment analysis
        metadata = sentiment_data.get('metadata', {})
        total_comments = metadata.get('total_comments_analyzed', 0)
        sentiment_breakdown = metadata.get('sentiment_breakdown', {})
        overall_sentiment = metadata.get('overall_sentiment', 'neutral')
        confidence = metadata.get('confidence', 0)
        raw_counts = metadata.get('raw_counts', {})
        
        # Get actual comment samples
        summary_data = sentiment_data.get('summary', {})
        top_positive_comments = summary_data.get('top_positive_comments', [])[:5]
        top_negative_comments = summary_data.get('top_negative_comments', [])[:5]
        
        # Extract key insights from comments
        comment_insights = self._extract_insights(top_positive_comments, top_negative_comments, query)
        
        # Create powerful Gemini prompt
        prompt = self._create_gemini_prompt(
            query, total_comments, sentiment_breakdown, raw_counts,
            overall_sentiment, confidence, comment_insights, 
            top_positive_comments, top_negative_comments
        )
        
        # Generate with Gemini 2.5 Flash
        print("🔥 Gemini 2.5 Flash generating intelligent summary...")
        response = self.model.generate_content(prompt)
        summary = response.text.strip()
        
        # Clean and enhance
        summary = self._clean_summary(summary)
        
        return {
            'paragraph_summary': summary,
            'generated_at': datetime.now().isoformat(),
            'model_used': 'google/gemini-2.5-flash',
            'confidence_level': 'high' if total_comments > 1000 else 'medium' if total_comments > 500 else 'low',
            'analysis_method': 'pure_gemini_analysis',
            'comments_analyzed': len(top_positive_comments) + len(top_negative_comments),
            'key_insights': comment_insights
        }

    def _extract_insights(self, positive_comments, negative_comments, query):
        """Extract key insights from actual comments - no BS analysis"""
        insights = {
            'positive_themes': [],
            'negative_themes': [],
            'common_words': [],
            'key_features_mentioned': [],
            'user_concerns': []
        }
        
        # Enhanced keyword analysis
        positive_keywords = {
            'satisfaction': ['love', 'amazing', 'great', 'excellent', 'perfect', 'awesome', 'fantastic', 'wonderful'],
            'design': ['beautiful', 'gorgeous', 'sleek', 'elegant', 'stunning', 'attractive'],
            'performance': ['fast', 'smooth', 'quick', 'responsive', 'powerful', 'snappy'],
            'value': ['worth', 'good deal', 'reasonable', 'affordable', 'value']
        }
        
        feature_keywords = {
            'camera': ['camera', 'photo', 'picture', 'photography', 'lens', 'zoom', 'portrait'],
            'battery': ['battery', 'charge', 'charging', 'power', 'lasting'],
            'display': ['display', 'screen', 'brightness', 'color', 'resolution'],
            'performance': ['speed', 'performance', 'processor', 'ram', 'storage', 'gaming'],
            'design': ['design', 'build', 'quality', 'premium', 'materials', 'color']
        }
        
        concern_keywords = {
            'pricing': ['expensive', 'price', 'cost', 'money', 'overpriced', 'cheap'],
            'battery': ['battery drain', 'battery life', 'charging slow', 'power'],
            'software': ['bug', 'issue', 'problem', 'glitch', 'lag', 'crash', 'freeze'],
            'heating': ['heat', 'warm', 'hot', 'overheating', 'temperature'],
            'camera': ['camera blur', 'photo quality', 'focus', 'night mode'],
            'build': ['fragile', 'scratch', 'break', 'durability', 'quality']
        }
        
        # Analyze positive comments
        for comment in positive_comments:
            text = comment.get('text', '').lower()
            if text:
                # Check positive themes
                for theme, keywords in positive_keywords.items():
                    if any(word in text for word in keywords):
                        insights['positive_themes'].append(theme)
                
                # Check features mentioned
                for feature, keywords in feature_keywords.items():
                    if any(word in text for word in keywords):
                        insights['key_features_mentioned'].append(feature)
        
        # Analyze negative comments
        for comment in negative_comments:
            text = comment.get('text', '').lower()
            if text:
                # Check concerns
                for concern, keywords in concern_keywords.items():
                    if any(word in text for word in keywords):
                        insights['user_concerns'].append(concern)
                
                # Also check features mentioned in negative context
                for feature, keywords in feature_keywords.items():
                    if any(word in text for word in keywords):
                        insights['key_features_mentioned'].append(feature)
        
        # Remove duplicates and limit results
        for key in insights:
            insights[key] = list(set(insights[key]))[:5]  # Limit to top 5 per category
        
        return insights

    def _create_gemini_prompt(self, query, total_comments, sentiment_breakdown, raw_counts, overall_sentiment, confidence, comment_insights, positive_comments, negative_comments):
        """Create a powerful Gemini prompt with real comment data"""
        
        pos_pct = sentiment_breakdown.get('positive', 0)
        neg_pct = sentiment_breakdown.get('negative', 0)
        neu_pct = sentiment_breakdown.get('neutral', 0)
        
        pos_count = raw_counts.get('positive', 0)
        neg_count = raw_counts.get('negative', 0)
        neu_count = raw_counts.get('neutral', 0)
        
        # Include actual comment samples for context
        sample_positive = ""
        if positive_comments:
            sample_positive = "\n".join([f"- \"{comment.get('text', '')[:150]}...\"" for comment in positive_comments[:3]])
        
        sample_negative = ""
        if negative_comments:
            sample_negative = "\n".join([f"- \"{comment.get('text', '')[:150]}...\"" for comment in negative_comments[:3]])
        
        prompt = f"""Analyze this Reddit sentiment data about "{query}" and create an intelligent summary.

DATA:
- Total Comments: {total_comments:,}
- Sentiment: {pos_count} positive ({pos_pct:.1f}%), {neg_count} negative ({neg_pct:.1f}%), {neu_count} neutral ({neu_pct:.1f}%)
- Overall: {overall_sentiment} ({confidence:.1f}% confidence)

POSITIVE THEMES: {', '.join(comment_insights['positive_themes']) if comment_insights['positive_themes'] else 'None'}
KEY FEATURES: {', '.join(comment_insights['key_features_mentioned']) if comment_insights['key_features_mentioned'] else 'None'}
USER CONCERNS: {', '.join(comment_insights['user_concerns']) if comment_insights['user_concerns'] else 'None'}

SAMPLE POSITIVE COMMENTS:
{sample_positive}

SAMPLE NEGATIVE COMMENTS:
{sample_negative}

Create a point-wise,detailed and  intelligent summary that captures the community's opinion about {query}. Be specific, data-driven, and insightful. No fluff."""
        
        return prompt

    def _clean_summary(self, summary):
        """Clean Gemini's response - remove fluff, keep power"""
        
        # Remove markdown and formatting
        cleaned = summary.replace("**", "").replace("*", "").replace("#", "").strip()
        
        # Remove meta-commentary
        lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
        content_lines = []
        
        for line in lines:
            # Skip instruction echoes
            if not any(skip in line.lower() for skip in ['summary:', 'analysis:', 'based on', 'in conclusion']):
                content_lines.append(line)
        
        # Join and finalize
        summary = ' '.join(content_lines)
        
        # Ensure proper ending
        if summary and not summary.endswith('.'):
            summary += '.'
        
        return summary



def test_gemini_power():
    """Test pure Gemini 2.5 Flash power"""
    generator = AISummaryGenerator()
    
    # Load real sentiment data
    with open('pre-process/sentiment_samsung_s24_1761241395.json', 'r', encoding='utf-8') as f:
        sentiment_data = json.load(f)
    
    print("🔥 Testing Gemini 2.5 Flash with Samsung S24 data...")
    result = generator.generate_paragraph_summary(sentiment_data, "Samsung S24")
    
    print(f"\n⚡ GEMINI 2.5 FLASH SUMMARY:")
    print(result['paragraph_summary'])
    print(f"\n🚀 Model: {result['model_used']}")
    print(f"🎯 Confidence: {result['confidence_level']}")
    print(f"📊 Method: {result['analysis_method']}")
    print(f"� Com ments Analyzed: {result['comments_analyzed']}")
    
    insights = result['key_insights']
    print(f"\n🔍 EXTRACTED INSIGHTS:")
    if insights['positive_themes']:
        print(f"   ✅ Positive: {', '.join(insights['positive_themes'])}")
    if insights['key_features_mentioned']:
        print(f"   🎯 Features: {', '.join(insights['key_features_mentioned'])}")
    if insights['user_concerns']:
        print(f"   ⚠️ Concerns: {', '.join(insights['user_concerns'])}")

if __name__ == "__main__":
    test_gemini_power()