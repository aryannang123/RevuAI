#!/usr/bin/env python3
"""
AI Summary Generator using Google Gemini 2.5 Flash
Features:
- Proper API key rotation across 4 accounts
- Session-based caching for efficiency
- Both structured summaries and conversational responses
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

load_dotenv()


class AISummaryGenerator:
    def __init__(self):
        """Initialize Gemini 2.5 Flash with multiple API keys for load balancing"""
        print("🚀 Initializing Multi-Account Gemini Summary Generator...")

        if not GEMINI_AVAILABLE:
            raise ImportError("❌ google-generativeai not installed! Run: pip install google-generativeai")

        self.api_keys = self._load_gemini_keys()
        if not self.api_keys:
            raise ValueError("❌ No GEMINI_API_KEY found in .env file")

        print(f"🔑 Loaded {len(self.api_keys)} Gemini API key(s)")

        self.models = []
        for i, key in enumerate(self.api_keys, 1):
            try:
                genai.configure(api_key=key)
                model = genai.GenerativeModel('models/gemini-2.5-flash')
                self.models.append({'model': model, 'api_key': key, 'account': i})
                print(f"⚡ Account {i}: Ready!")
            except Exception as e:
                print(f"⚠️ Account {i} failed: {e}")

        if not self.models:
            raise ValueError("❌ No Gemini models initialized!")

        # ✅ IMPORTANT: Start at 0 for proper rotation
        self.current_model_index = 0
        print(f"✅ {len(self.models)} active Gemini account(s) ready.")
        print(f"🔄 API rotation enabled (starting at index 0)")

    # ================================================================
    # 🔹 Utility Functions
    # ================================================================
    def _load_gemini_keys(self):
        """Load all available Gemini API keys from environment"""
        keys = []
        # Load primary key
        if os.getenv('GEMINI_API_KEY') and not os.getenv('GEMINI_API_KEY').startswith('your_'):
            keys.append(os.getenv('GEMINI_API_KEY'))

        # Load additional keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
        i = 1
        while True:
            k = os.getenv(f'GEMINI_API_KEY_{i}')
            if not k or k.startswith('your_'):
                break
            keys.append(k)
            i += 1
        return keys

    def _get_next_model(self):
        """
        ✅ FIXED: Proper round-robin rotation between API accounts
        Returns next model and advances index
        """
        if not self.models:
            raise ValueError("No Gemini models available!")
        
        # Get current model
        model = self.models[self.current_model_index]
        
        # Advance to next model (circular rotation)
        self.current_model_index = (self.current_model_index + 1) % len(self.models)
        
        print(f"🎯 Selected: Account {model['account']} (Next will be Account {self.models[self.current_model_index]['account']})")
        
        return model

    # ================================================================
    # 🔹 NEW: General-purpose Chat Response Generator
    # ================================================================
    def generate_response(self, prompt: str, max_retries: int = None) -> str:
        """
        Generate a natural language response using Gemini with automatic API rotation.
        
        Args:
            prompt: The prompt to send to Gemini
            max_retries: Max number of API keys to try (default: all available)
        
        Returns:
            Generated response text or error message
        """
        if max_retries is None:
            max_retries = len(self.models)
        
        print(f"\n🧠 [GeminiChat] Generating conversational response...")
        print(f"   Prompt length: {len(prompt)} chars")
        print(f"   Starting with API index: {self.current_model_index}")
        print(f"   Available API keys: {len(self.models)}")

        attempts = 0
        last_error = None

        # Try up to max_retries different API keys
        for attempt in range(max_retries):
            attempts += 1
            model_info = self._get_next_model()
            
            try:
                print(f"🔄 Attempt {attempts}/{max_retries}: Using Account {model_info['account']}")
                
                # Generate content
                result = model_info['model'].generate_content(prompt)
                
                if hasattr(result, "text") and result.text:
                    print(f"✅ SUCCESS on Account {model_info['account']}")
                    print(f"   Response length: {len(result.text)} chars")
                    print(f"   Next API will be: Account {self.models[self.current_model_index]['account']}")
                    return result.text.strip()
                else:
                    print(f"⚠️ Empty response from Account {model_info['account']}")
                    last_error = "Empty response"
                    
            except Exception as e:
                error_msg = str(e)
                print(f"❌ Account {model_info['account']} failed: {error_msg[:100]}")
                last_error = error_msg
                
                # Check if it's a rate limit error
                if "429" in error_msg or "quota" in error_msg.lower():
                    print(f"   → Rate limited, trying next account...")
                continue

        # All attempts failed
        print(f"❌ All {attempts} API key(s) failed to generate a response")
        print(f"   Last error: {last_error}")
        return "⚠️ Gemini service temporarily unavailable. All API keys exhausted. Please try again in a moment."

    # ================================================================
    # 🔹 Structured Summary Generator (existing)
    # ================================================================
    def generate_paragraph_summary(self, sentiment_data, query):
        """Generate a concise summary with separate positive and negative insights"""
        print(f"⚡ Gemini analyzing sentiment data for: {query}")

        metadata = sentiment_data.get('metadata', {})
        total_comments = metadata.get('total_comments_analyzed', 0)
        sentiment_breakdown = metadata.get('sentiment_breakdown', {})
        overall_sentiment = metadata.get('overall_sentiment', 'neutral')
        raw_counts = metadata.get('raw_counts', {})

        summary_data = sentiment_data.get('summary', {})
        top_positive_comments = summary_data.get('top_positive_comments', [])[:5]
        top_negative_comments = summary_data.get('top_negative_comments', [])[:5]

        insights = self._extract_insights(top_positive_comments, top_negative_comments, query)

        prompt = self._create_gemini_prompt(
            query, total_comments, sentiment_breakdown, raw_counts,
            overall_sentiment, insights, top_positive_comments, top_negative_comments
        )

        print("🔥 Generating Gemini reasoning-based summary...")
        print(f"   Using API rotation (current index: {self.current_model_index})")

        # Use the same rotation logic
        summary = self.generate_response(prompt)
        
        if summary.startswith("⚠️"):
            print("⚠️ Summary generation failed")
        else:
            summary = self._clean_summary(summary)

        return {
            'paragraph_summary': summary,
            'generated_at': datetime.now().isoformat(),
            'model_used': 'google/gemini-2.5-flash',
            'analysis_method': 'gemini_reasoning_multi_account',
            'comments_analyzed': len(top_positive_comments) + len(top_negative_comments),
            'key_insights': insights,
            'api_accounts_available': len(self.models)
        }

    # ================================================================
    # 🔹 Developer Suggestions Generator (NEW)
    # ================================================================
    def generate_developer_suggestions(self, sentiment_data, query):
        """Generate actionable developer suggestions based on negative feedback"""
        print(f"🛠️ Gemini generating developer suggestions for: {query}")

        metadata = sentiment_data.get('metadata', {})
        total_comments = metadata.get('total_comments_analyzed', 0)
        sentiment_breakdown = metadata.get('sentiment_breakdown', {})
        raw_counts = metadata.get('raw_counts', {})

        summary_data = sentiment_data.get('summary', {})
        top_negative_comments = summary_data.get('top_negative_comments', [])[:10]  # More negative comments for better insights
        
        # Extract negative insights for context
        negative_insights = self._extract_negative_insights(top_negative_comments, query)

        prompt = self._create_developer_suggestions_prompt(
            query, total_comments, sentiment_breakdown, raw_counts,
            negative_insights, top_negative_comments
        )

        print("🔥 Generating Gemini developer suggestions...")
        print(f"   Using API rotation (current index: {self.current_model_index})")

        suggestions = self.generate_response(prompt)
        
        if suggestions.startswith("⚠️"):
            print("⚠️ Developer suggestions generation failed")
        else:
            suggestions = self._clean_summary(suggestions)

        return {
            'developer_suggestions': suggestions,
            'generated_at': datetime.now().isoformat(),
            'model_used': 'google/gemini-2.5-flash',
            'analysis_method': 'gemini_negative_feedback_analysis',
            'negative_comments_analyzed': len(top_negative_comments),
            'key_issues': negative_insights,
            'api_accounts_available': len(self.models)
        }

    def _extract_negative_insights(self, negative_comments, query):
        """Extract key issues from negative comments"""
        insights = {'performance_issues': [], 'usability_problems': [], 'feature_requests': [], 'bugs_crashes': []}

        keywords = {
            'performance': ['slow', 'lag', 'freeze', 'crash', 'hang', 'performance', 'speed'],
            'usability': ['confusing', 'difficult', 'hard to use', 'ui', 'ux', 'interface', 'navigation'],
            'features': ['missing', 'need', 'want', 'should have', 'feature', 'add', 'include'],
            'bugs': ['bug', 'error', 'broken', 'not working', 'issue', 'problem', 'glitch']
        }

        for c in negative_comments:
            text = c.get('text', '').lower()
            for category, words in keywords.items():
                if any(word in text for word in words):
                    if category == 'performance':
                        insights['performance_issues'].append(category)
                    elif category == 'usability':
                        insights['usability_problems'].append(category)
                    elif category == 'features':
                        insights['feature_requests'].append(category)
                    elif category == 'bugs':
                        insights['bugs_crashes'].append(category)

        # Remove duplicates and limit
        for key in insights:
            insights[key] = list(set(insights[key]))[:3]
        
        return insights

    def _create_developer_suggestions_prompt(self, query, total_comments, sentiment_breakdown, raw_counts, negative_insights, negative_comments):
        """Create prompt specifically for developer suggestions based on negative feedback"""
        neg_pct = sentiment_breakdown.get('negative', 0)
        very_neg_pct = sentiment_breakdown.get('very_negative', 0)
        total_negative_pct = neg_pct + very_neg_pct

        prompt = f"""
You are a product intelligence assistant analyzing negative Reddit feedback
to help developers identify what needs improvement in their product.

Your goal is to translate user frustration, complaints, and low-sentiment comments
into specific, actionable recommendations developers can implement.

Use only the negative or frustrated user comments provided — ignore neutral or positive ones.

STRUCTURE YOUR OUTPUT AS FOLLOWS:

**DEVELOPER SUGGESTIONS**

**PRIORITY FIXES:**
• [Critical recurring issue mentioned in negative comments — describe the problem and suggest an actionable technical fix]
• [User experience pain point causing frustration — propose a clear improvement]
• [Performance, stability, or reliability issue frequently reported — give a direct optimization approach]
• [Missing or broken feature users complain about — suggest how to fix or enhance it]

**ENHANCEMENT OPPORTUNITIES:**
• [UI/UX improvement that would reduce negative feedback — describe the exact change]
• [Feature enhancement that addresses repeated user complaints — explain expected benefit]
• [Quality-of-life adjustment that users would appreciate — give an actionable recommendation]
• [Strategic or long-term fix to prevent future user dissatisfaction — propose an implementation idea]

**GUIDELINES:**
- Focus entirely on *negative or low-sentiment comments*.
- Base insights strictly on what users said — avoid assumptions not supported by data.
- Be concise (1–2 sentences per point).
- Make each suggestion specific, measurable, and directly actionable by developers.
- Avoid generic statements like “Improve performance” — be concrete (e.g., “Reduce app load time by optimizing image assets”).
- Write in a professional tone suitable for a developer improvement report.
"""

        return prompt

    # ================================================================
    # 🔹 Combined Analysis Generator (COST OPTIMIZED)
    # ================================================================
    def generate_combined_analysis(self, sentiment_data, query):
        """Generate both AI summary and developer suggestions in a single API call"""
        print(f"🚀 Gemini generating combined analysis for: {query}")

        metadata = sentiment_data.get('metadata', {})
        total_comments = metadata.get('total_comments_analyzed', 0)
        sentiment_breakdown = metadata.get('sentiment_breakdown', {})
        overall_sentiment = metadata.get('overall_sentiment', 'neutral')
        raw_counts = metadata.get('raw_counts', {})

        summary_data = sentiment_data.get('summary', {})
        top_positive_comments = summary_data.get('top_positive_comments', [])[:5]
        top_negative_comments = summary_data.get('top_negative_comments', [])[:10]

        # Extract insights for both analyses
        insights = self._extract_insights(top_positive_comments, top_negative_comments, query)
        negative_insights = self._extract_negative_insights(top_negative_comments, query)

        prompt = self._create_combined_analysis_prompt(
            query, total_comments, sentiment_breakdown, raw_counts,
            overall_sentiment, insights, negative_insights, 
            top_positive_comments, top_negative_comments
        )

        print("🔥 Generating combined Gemini analysis (1 API call)...")
        print(f"   Using API rotation (current index: {self.current_model_index})")

        response = self.generate_response(prompt)
        
        if response.startswith("⚠️"):
            print("⚠️ Combined analysis generation failed")
            return self._create_fallback_combined_analysis(query, total_comments, overall_sentiment)

        # Parse the combined response
        parsed_response = self._parse_combined_response(response)
        
        return {
            'ai_summary': {
                'paragraph_summary': parsed_response['summary'],
                'generated_at': datetime.now().isoformat(),
                'model_used': 'google/gemini-2.5-flash',
                'analysis_method': 'gemini_combined_analysis',
                'comments_analyzed': len(top_positive_comments) + len(top_negative_comments),
                'key_insights': insights,
                'api_accounts_available': len(self.models)
            },
            'developer_suggestions': {
                'developer_suggestions': parsed_response['suggestions'],
                'generated_at': datetime.now().isoformat(),
                'model_used': 'google/gemini-2.5-flash',
                'analysis_method': 'gemini_combined_analysis',
                'negative_comments_analyzed': len(top_negative_comments),
                'key_issues': negative_insights,
                'api_accounts_available': len(self.models)
            }
        }

    def _create_combined_analysis_prompt(self, query, total_comments, sentiment_breakdown, raw_counts,
                                       overall_sentiment, insights, negative_insights, 
                                       positive_comments, negative_comments):
        """Create a single prompt for both summary and developer suggestions"""
        pos_pct = sentiment_breakdown.get('positive', 0)
        neg_pct = sentiment_breakdown.get('negative', 0)
        neu_pct = sentiment_breakdown.get('neutral', 0)
        total_negative_pct = neg_pct + sentiment_breakdown.get('very_negative', 0)

        prompt = f"""
You are a professional market research analyst and product consultant analyzing user feedback for {query}.

**Data Overview:**
- Total Comments: {total_comments}
- Sentiment: {pos_pct:.1f}% Positive, {neg_pct:.1f}% Negative, {neu_pct:.1f}% Neutral
- Overall: {overall_sentiment.title()}
- Negative Feedback: {total_negative_pct:.1f}% of users expressed concerns

**Sample Positive Comments:**
{chr(10).join(f"- {c.get('text', '')[:100]}..." for c in positive_comments[:3] if c.get('text'))}

**Sample Negative Comments:**
{chr(10).join(f"- {c.get('text', '')[:100]}..." for c in negative_comments[:5] if c.get('text'))}

**CRITICAL: You MUST format your response EXACTLY like this:**

**USER INSIGHTS SUMMARY:**

**POSITIVE INSIGHTS:**
• [First positive insight based on the data - be specific and actionable]
• [Second positive insight - focus on what users appreciate most]
• [Third positive insight - highlight key strengths mentioned]
• [Fourth positive insight - additional user satisfaction point]

**NEGATIVE INSIGHTS:**
• [First negative concern - be specific about user pain points]
• [Second negative concern - focus on most common complaints]
• [Third negative concern - highlight areas needing improvement]
• [Fourth negative concern - additional user frustration point]

**DEVELOPER SUGGESTIONS:**

**PRIORITY FIXES:**
• [High-impact issue that needs immediate attention - be specific and actionable]
• [Critical user experience problem that's causing frustration - provide solution]
• [Performance or stability issue mentioned frequently - suggest technical fix]
• [Major feature gap that users are requesting - recommend implementation]

**ENHANCEMENT OPPORTUNITIES:**
• [User interface improvement based on feedback - specific UI/UX suggestion]
• [Feature enhancement that would address common complaints - detailed recommendation]
• [Quality of life improvement that users would appreciate - actionable suggestion]
• [Long-term strategic improvement based on user needs - implementation approach]

**INSTRUCTIONS:**
- Base insights on the actual comments provided
- Keep each point to 1-2 sentences maximum
- Be specific and actionable, avoid generic statements
- Focus on what users actually said, not just percentages
- Developer suggestions should directly address issues mentioned in negative comments
"""
        return prompt

    def _parse_combined_response(self, response):
        """Parse the combined response into summary and suggestions"""
        try:
            # Split response into summary and suggestions sections
            if "**DEVELOPER SUGGESTIONS:**" in response:
                parts = response.split("**DEVELOPER SUGGESTIONS:**")
                summary_part = parts[0].strip()
                suggestions_part = "**DEVELOPER SUGGESTIONS:**" + parts[1].strip()
            else:
                # Fallback if format is different
                summary_part = response[:len(response)//2]
                suggestions_part = response[len(response)//2:]
            
            return {
                'summary': summary_part,
                'suggestions': suggestions_part
            }
        except Exception as e:
            print(f"⚠️ Error parsing combined response: {e}")
            return {
                'summary': response[:len(response)//2],
                'suggestions': response[len(response)//2:]
            }

    def _create_fallback_combined_analysis(self, query, total_comments, overall_sentiment):
        """Create fallback analysis if API fails"""
        return {
            'ai_summary': {
                'paragraph_summary': f"Analysis of {total_comments} comments about '{query}' shows {overall_sentiment.replace('_', ' ')} sentiment overall.",
                'generated_at': datetime.now().isoformat(),
                'model_used': 'fallback',
                'error': 'API generation failed'
            },
            'developer_suggestions': {
                'developer_suggestions': f"Based on user feedback analysis, consider addressing user concerns about {query}.",
                'generated_at': datetime.now().isoformat(),
                'model_used': 'fallback',
                'error': 'API generation failed'
            }
        }

    # ================================================================
    # 🔹 Insight Extraction Helpers
    # ================================================================
    def _extract_insights(self, positive_comments, negative_comments, query):
        """Extract recurring themes and issues"""
        insights = {'positive_themes': [], 'user_concerns': [], 'key_features_mentioned': []}

        keywords = {
            'positive': {
                'performance': ['fast', 'smooth', 'powerful', 'responsive'],
                'design': ['beautiful', 'sleek', 'premium', 'modern'],
                'value': ['worth', 'deal', 'value', 'affordable'],
                'battery': ['long', 'lasting', 'battery life', 'efficient']
            },
            'negative': {
                'price': ['expensive', 'costly', 'pricey'],
                'battery': ['drain', 'charge', 'low battery'],
                'software': ['bug', 'crash', 'lag', 'freeze'],
                'heating': ['heat', 'overheat', 'warm']
            }
        }

        for c in positive_comments:
            t = c.get('text', '').lower()
            for k, v in keywords['positive'].items():
                if any(x in t for x in v):
                    insights['positive_themes'].append(k)

        for c in negative_comments:
            t = c.get('text', '').lower()
            for k, v in keywords['negative'].items():
                if any(x in t for x in v):
                    insights['user_concerns'].append(k)

        for key in insights:
            insights[key] = list(set(insights[key]))[:4]
        return insights

    # ================================================================
    # 🔹 Prompt Construction for Summaries
    # ================================================================
    def _create_gemini_prompt(self, query, total_comments, sentiment_breakdown, raw_counts,
                              overall_sentiment, insights, positive_comments, negative_comments):
        pos_pct = sentiment_breakdown.get('positive', 0)
        neg_pct = sentiment_breakdown.get('negative', 0)
        neu_pct = sentiment_breakdown.get('neutral', 0)

        prompt = f"""
You are a professional market research analyst analyzing user sentiment for {query}.

**Data Overview:**
- Total Comments: {total_comments}
- Sentiment: {pos_pct:.1f}% Positive, {neg_pct:.1f}% Negative, {neu_pct:.1f}% Neutral
- Overall: {overall_sentiment.title()}

**Sample Positive Comments:**
{chr(10).join(f"- {c.get('text', '')[:100]}..." for c in positive_comments[:3] if c.get('text'))}

**Sample Negative Comments:**
{chr(10).join(f"- {c.get('text', '')[:100]}..." for c in negative_comments[:3] if c.get('text'))}

**CRITICAL: You MUST format your response EXACTLY like this:**

**POSITIVE INSIGHTS:**
• Users praise the performance and speed improvements compared to previous models
• Many appreciate the enhanced camera quality and photo processing capabilities  
• The build quality and premium design receive consistent positive feedback
• Battery efficiency and optimization features are well-received by daily users

**NEGATIVE INSIGHTS:**
• Battery life concerns are frequently mentioned by users in daily usage scenarios
• Price point is considered too high by many potential buyers and existing users
• Some users report heating issues during intensive tasks and gaming sessions
• Software bugs and occasional crashes frustrate users during regular usage

**INSTRUCTIONS:**
- Use EXACTLY the format above with "**POSITIVE INSIGHTS:**" and "**NEGATIVE INSIGHTS:**"
- Each section must have exactly 4 bullet points using "•" 
- Base insights on the actual comments provided
- Keep each point to 1-2 sentences maximum
- Be specific and actionable, avoid generic statements
- Focus on what users actually said, not percentages"""
        return prompt

    # ================================================================
    # 🔹 Clean-up Helper
    # ================================================================
    def _clean_summary(self, summary):
        """Clean and format the summary text"""
        cleaned = summary.replace("**", "").replace("*", "").replace("#", "").strip()
        lines = [l.strip() for l in cleaned.split('\n') if l.strip()]
        formatted = []
        for l in lines:
            if l[0].isdigit() and '.' in l[:3]:
                formatted.append(l)
            elif formatted:
                formatted[-1] += ' ' + l
            else:
                formatted.append(l)
        return "\n".join(formatted)


# ================================================================
# 🔹 Manual Test
# ================================================================
def test_gemini_rotation():
    """Test API key rotation"""
    generator = AISummaryGenerator()
    
    print("\n" + "="*60)
    print("🧪 Testing API Key Rotation")
    print("="*60)
    
    # Test 5 requests to see rotation
    for i in range(5):
        print(f"\n--- Request {i+1} ---")
        response = generator.generate_response(f"Test message {i+1}: What is 2+2?")
        print(f"Response: {response[:100]}...")
        print(f"Current index after request: {generator.current_model_index}")
    
    print("\n" + "="*60)
    print("✅ Rotation test complete!")


if __name__ == "__main__":
    test_gemini_rotation()