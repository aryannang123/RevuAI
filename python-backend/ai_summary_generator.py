#!/usr/bin/env python3
"""
AI Summary Generator using Google Gemini 2.5 Flash
Now with separate Positive & Negative insight sections,
and 75% Gemini reasoning / 25% data grounding.
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
        """Initialize Gemini 2.5 Flash with multiple API keys for scaling"""
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

        self.current_model_index = 0
        print(f"✅ {len(self.models)} active Gemini account(s) ready.")

    def _load_gemini_keys(self):
        """Load all available Gemini API keys from environment"""
        keys = []
        if os.getenv('GEMINI_API_KEY') and not os.getenv('GEMINI_API_KEY').startswith('your_'):
            keys.append(os.getenv('GEMINI_API_KEY'))

        i = 1
        while True:
            k = os.getenv(f'GEMINI_API_KEY_{i}')
            if not k or k.startswith('your_'):
                break
            keys.append(k)
            i += 1
        return keys

    def _get_next_model(self):
        """Rotate between API accounts"""
        model = self.models[self.current_model_index]
        self.current_model_index = (self.current_model_index + 1) % len(self.models)
        return model

    # ================================================================
    # 🔹 MAIN FUNCTION
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

        summary = ""
        for _ in range(len(self.models)):
            model_info = self._get_next_model()
            try:
                print(f"🎯 Using Gemini Account {model_info['account']}")
                response = model_info['model'].generate_content(prompt)
                summary = response.text.strip()
                print(f"✅ Success (Account {model_info['account']})")
                break
            except Exception as e:
                print(f"⚠️ Account {model_info['account']} failed: {e}")
                continue

        summary = self._clean_summary(summary)

        return {
            'paragraph_summary': summary,
            'generated_at': datetime.now().isoformat(),
            'model_used': 'google/gemini-2.5-flash',
            'analysis_method': 'gemini_reasoning_75pct_brain',
            'comments_analyzed': len(top_positive_comments) + len(top_negative_comments),
            'key_insights': insights
        }

    # ================================================================
    # 🔹 INSIGHT EXTRACTION
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
    # 🔹 PROMPT (Positive + Negative Sections)
    # ================================================================
    def _create_gemini_prompt(self, query, total_comments, sentiment_breakdown, raw_counts,
                              overall_sentiment, insights, positive_comments, negative_comments):
        pos_pct = sentiment_breakdown.get('positive', 0)
        neg_pct = sentiment_breakdown.get('negative', 0)
        neu_pct = sentiment_breakdown.get('neutral', 0)

        prompt = f"""
You are a professional market research analyst. Your job is to convert raw, categorized sentiment data into a clear, concise executive summary for a non-technical stakeholder (like a Product Manager or marketing lead).

The stakeholder will also be viewing pie charts and bar graphs that show the *percentage* of each sentiment (Positive, Negative, etc.).

**Your task is to write a summary that explains the "WHY" behind those percentages.** Do NOT simply state the counts or percentages (e.g., "There are 50 positive comments"). Instead, synthesize the *key themes* from the comments in each category.

---

**Product/Topic:**
{query}

**Data Overview:**
- Total Comments Analyzed: {total_comments}
- Sentiment Distribution: {pos_pct:.1f}% Positive, {neg_pct:.1f}% Negative, {neu_pct:.1f}% Neutral
- Overall Sentiment: {overall_sentiment.title()}

**Key Insights:**
- Positive Themes: {', '.join(insights['positive_themes'])}
- User Concerns: {', '.join(insights['user_concerns'])}

**Sample Comments:**
Positive:
{chr(10).join(f"- {c.get('text', '')}" for c in positive_comments[:3])}

Negative:
{chr(10).join(f"- {c.get('text', '')}" for c in negative_comments[:3])}

---

**Instructions for the Summary:**

1.  **Start with an "Overall Sentiment"**: Give a 1-2 sentence high-level overview. (e.g., "Public sentiment for the {query} is largely positive, driven by strong appreciation for its new features, though there are notable concerns about its price.")
2.  **Positive Highlights**: In a bulleted list, summarize the 2-3 main themes people *love*. What specific features or aspects are praised?
3.  **Negative Pain Points**: In a bulleted list, summarize the 2-3 most common *complaints* or *problems*. What is driving the negative feedback?
4.  **Mixed & Neutral Observations**: Briefly mention any common themes from the mixed/neutral comments. This often includes feature requests, points of confusion, or "it's good, but..." statements.

Keep the language clear, professional, and directly actionable.
remove all unnecessary words like here is the summary
"""
        return prompt

    # ================================================================
    # 🔹 CLEAN SUMMARY
    # ================================================================
    def _clean_summary(self, summary):
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
# 🔹 TEST FUNCTION
# ================================================================
def test_gemini_power():
    generator = AISummaryGenerator()
    with open('pre-process/sentiment_samsung_s24_1761241395.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("🔥 Testing Gemini 2.5 Flash (75% Reasoning, Split Insights)...")
    result = generator.generate_paragraph_summary(data, "Samsung S24")

    print(f"\n⚡ Gemini Summary:\n{result['paragraph_summary']}")
    print(f"\n📊 Model: {result['model_used']}")
    print(f"💬 Comments Analyzed: {result['comments_analyzed']}")
    print(f"🧠 Method: {result['analysis_method']}")


if __name__ == "__main__":
    test_gemini_power()
