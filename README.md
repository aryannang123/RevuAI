# 🚀 RevAI - AI-Powered Reddit Sentiment Analysis Platform

> **Empowering Product Analytics through Intelligent Reddit Feedback Analysis**

RevAI is a cutting-edge sentiment analysis platform that harnesses the power of Reddit's vast community discussions to provide deep insights into product sentiment, user feedback, and market intelligence. Built with modern AI technologies and real-time processing capabilities.

![RevAI Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-2.3+-red)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)

## ✨ Features

### 🎯 **Core Capabilities**
- **Multi-Account Reddit Fetching**: Ultra-fast data collection using 4 Reddit accounts simultaneously
- **Advanced Sentiment Analysis**: 5-class sentiment classification (Very Negative → Very Positive)
- **Emotion Detection**: Comprehensive emotion analysis using state-of-the-art AI models
- **Real-time Progress Tracking**: Live updates during analysis with beautiful liquid loader animations
- **AI-Powered Insights**: Strategic business intelligence with 90% expert reasoning, 10% data validation

### 🧠 **AI & Analytics**
- **Hugging Face Integration**: Leverages `j-hartmann/emotion-english-distilroberta-base` for emotion detection
- **Gemini AI Chat**: Interactive Q&A with context-aware responses and API key rotation
- **Adaptive Filtering**: Smart relevance detection with relaxed/strict modes based on engagement
- **Session Management**: Optimized caching and conversation continuity

### 🔧 **Technical Excellence**
- **Parallel Processing**: ThreadPoolExecutor with up to 16 concurrent workers
- **Rate Limit Handling**: Intelligent account rotation and backoff strategies
- **Progress Streaming**: Server-Sent Events (SSE) for real-time updates
- **Data Persistence**: Supabase integration with automatic search history
- **Responsive UI**: Modern React/Next.js interface with Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI    │◄──►│   Flask Backend  │◄──►│  Reddit API     │
│                 │    │                  │    │  (4 Accounts)   │
│ • Real-time UI  │    │ • Multi-threading│    │                 │
│ • Progress Bar  │    │ • AI Processing  │    └─────────────────┘
│ • Chat Interface│    │ • SSE Streaming  │           │
└─────────────────┘    └──────────────────┘           │
         │                       │                    │
         │              ┌──────────────────┐          │
         └──────────────►│   Supabase DB    │          │
                        │                  │          │
                        │ • User Sessions  │          │
                        │ • Search History │          │
                        │ • Analysis Data  │          │
                        └──────────────────┘          │
                                 │                    │
                        ┌──────────────────┐          │
                        │   AI Services    │◄─────────┘
                        │                  │
                        │ • Hugging Face   │
                        │ • Gemini AI      │
                        │ • Sentiment ML   │
                        └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn
- **Python** 3.9+ with pip
- **Reddit API** credentials (4 accounts recommended)
- **Supabase** project
- **Google Gemini API** keys (multiple recommended)



###  Backend Setup
```bash
cd python-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Upgrade pip (recommended)
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Configuration section)

# Start backend server
python app.py
```

### Frontend Setup
```bash
cd my-app

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Database Setup
```bash
# Run SQL scripts in my-app/database/ folder in your Supabase dashboard
# This creates the necessary tables for user sessions and search history
```

## ⚙️ Configuration

### Backend Environment (.env)
```env
# Reddit API Credentials (Account 1)
REDDIT_CLIENT_ID=your_client_id_1
REDDIT_CLIENT_SECRET=your_client_secret_1
REDDIT_USERNAME=your_username_1
REDDIT_PASSWORD=your_password_1

# Reddit API Credentials (Account 2-4)
REDDIT_CLIENT_ID_2=your_client_id_2
REDDIT_CLIENT_SECRET_2=your_client_secret_2
# ... (repeat for accounts 3 and 4)

# Gemini AI API Keys (Multiple for rotation)
GEMINI_API_KEY_1=your_gemini_key_1
GEMINI_API_KEY_2=your_gemini_key_2
GEMINI_API_KEY_3=your_gemini_key_3
GEMINI_API_KEY_4=your_gemini_key_4

# Flask Configuration
FLASK_SECRET_KEY=your_secret_key_here
```

### Frontend Environment (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:5000
```

## 📊 Usage

### 1. **Product Sentiment Analysis**
1. Enter a product name (e.g., "iPhone 15", "Tesla Model 3")
2. Watch real-time progress as RevAI:
   - Fetches relevant Reddit posts and comments
   - Analyzes sentiment using advanced AI models
   - Generates comprehensive insights
3. View detailed analytics dashboard with:
   - Sentiment breakdown charts
   - Emotion analysis
   - Top positive/negative comments
   - AI-generated summary(Positive and negative Insights based on data fetched)
   - Developer suggestions(how to improvise on their product)

### 2. **Interactive AI Chat**
- Ask questions about the analyzed product
- Get strategic business insights (80% AI reasoning + 20% data)
- Explore market trends and competitive analysis
- Receive actionable recommendations

### 3. **Search History**
- All analyses are automatically saved
- Access previous searches from sidebar
- Compare sentiment across different time periods



### Reddit Analysis
```http
POST /api/reddit/fetch-mass-comments
Content-Type: application/json

{
  "query": "product name",
  "target_comments": 2000,
  "min_score": 2,
  "session_id": "unique_session_id"
}
```

### AI Chat
```http
POST /api/gemini/chat
Content-Type: application/json

{
  "message": "What are the main concerns about this product?",
  "sessionId": "chat_session_id",
  "conversationHistory": []
}
```



## 🎨 Key Components

### Frontend (Next.js)
- **RevAiLoader**: Animated liquid progress indicator with real-time updates
- **SentimentCharts**: Interactive data visualizations using Chart.js
- **Sidebar**: Search history and user session management
- **Iridescence**: Dynamic background animations

### Backend (Flask)
- **MultiAccountRedditFetcher**: Parallel Reddit data collection
- **EnhancedSentimentAnalyzer**: AI-powered sentiment classification
- **AISummaryGenerator**: Gemini AI integration with key rotation
- **Progress Streaming**: Real-time SSE updates

## 🚀 Performance

- **Speed**: ~60 comments/second with 4 Reddit accounts
- **Scalability**: Handles 2000+ comments per analysis
- **Reliability**: Automatic failover and rate limit handling
- **Efficiency**: Smart caching and session management

## 🛠️ Development

### Project Structure
```
RevAI/
├── my-app/                 # Next.js Frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── database/          # SQL scripts
├── python-backend/        # Flask Backend
│   ├── app.py            # Main Flask application
│   ├── reddit_fetcher.py # Reddit API integration
│   ├── enhanced_sentiment_analyzer.py
│   └── ai_summary_generator.py
└── README.md
```
```

## 🙏 Acknowledgments

- **Hugging Face** for sentiment analysis models
- **Google Gemini** for AI chat capabilities
- **Reddit API** for community data access
- **Supabase** for database infrastructure
- **Next.js & Flask** for the robust tech stack

## TEAM MEMBERS

    ARYAN NANGARATH- aryannangarath407@gmail.com
    AMOGH HERLE-amoghherle07@gmail.com
    ESHWAR-eshwar10245@gmail.com
    GAGAN R- gaganraghavan@gmail.com

---

**Built with ❤️ by the Alt F4 Team**

*Transforming Reddit conversations into actionable business intelligence.*
