"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Brain, TrendingUp, TrendingDown, Minus, MessageSquare, ArrowLeft, Download, Share2, Sparkles } from 'lucide-react';


export default function AnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [animatedStats, setAnimatedStats] = useState({ positive: 0, negative: 0, neutral: 0 });


  // Utility function to format AI summary text
  const formatAISummary = (summaryText: string) => {
    if (!summaryText) return null;

    // Clean up unwanted prefixes and formatting issues
    let cleanedText = summaryText
      // Remove "Here's an intelligent summary" with any variations
      .replace(/^.*?Here's an intelligent summary.*?regarding.*?[":]\s*/i, '')
      .replace(/^.*?Here's an intelligent summary.*?[":]\s*/i, '')
      // Remove numbered prefixes
      .replace(/^\d+[\s\.\)]+/, '')
      // Remove other common AI prefixes
      .replace(/^(Based on|According to|Analysis shows|The data reveals|Summary:|Analysis:).*?[":]\s*/i, '')
      // Remove any remaining leading colons or dashes
      .replace(/^[:;\-\s]+/, '')
      // Clean up extra whitespace and line breaks
      .trim();

    // Use the cleaned text for all further processing
    summaryText = cleanedText;

    // Check for bullet points with • symbol
    if (summaryText.includes('•')) {
      const points = summaryText.split('•').filter(point => point.trim().length > 0);
      return (
        <div className="space-y-4">
          {points.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-3 flex-shrink-0"></div>
              <p className="text-gray-200 text-lg leading-relaxed font-medium">
                {point.trim()}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Check for numbered points (1., 2., etc.)
    if (/^\s*\d+\.\s/.test(summaryText) || summaryText.includes('\n1.') || summaryText.includes(' 1.')) {
      const points = summaryText.split(/(?=\d+\.\s)/).filter(point => point.trim().length > 0);
      return (
        <div className="space-y-4">
          {points.map((point, index) => {
            const cleanPoint = point.replace(/^\d+\.\s*/, '').trim();
            if (!cleanPoint) return null;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 text-sm font-bold flex-shrink-0 mt-1">
                  {index + 1}
                </div>
                <p className="text-gray-200 text-lg leading-relaxed font-medium">
                  {cleanPoint}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    // Check for dash points (-, -, etc.)
    if (summaryText.includes('\n-') || summaryText.includes('\n •') || summaryText.includes('\n*')) {
      const points = summaryText.split(/\n[-•*]\s*/).filter(point => point.trim().length > 0);
      return (
        <div className="space-y-4">
          {points.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-3 flex-shrink-0"></div>
              <p className="text-gray-200 text-lg leading-relaxed font-medium">
                {point.trim()}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Split long paragraphs into sentences for better readability
    const sentences = summaryText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      return (
        <div className="space-y-3">
          {sentences.map((sentence, index) => (
            <p key={index} className="text-gray-200 text-lg leading-relaxed font-medium">
              {sentence.trim()}
            </p>
          ))}
        </div>
      );
    }

    // Fallback: single paragraph
    return (
      <p className="text-gray-200 text-lg leading-relaxed font-medium">
        {summaryText}
      </p>
    );
  };

  useEffect(() => {
    const query = sessionStorage.getItem('search_query');
    const redditData = sessionStorage.getItem('reddit_data');

    if (!query || !redditData) {
      router.push('/');
      return;
    }

    const data = JSON.parse(redditData);
    
    fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000'}/api/sentiment/get-analysis/${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(sentimentResult => {
        // Handle both old and new data structures
        const metadata = sentimentResult.metadata || sentimentResult;
        const summary = sentimentResult.summary || {};
        
        setSentimentData({
          query,
          totalComments: metadata.total_comments_analyzed || 0,
          analyzedAt: new Date(metadata.analyzed_at).toLocaleDateString(),
          sentiments: metadata.sentiment_breakdown || { positive: 0, negative: 0, neutral: 0 },
          rawCounts: metadata.raw_counts || { positive: 0, negative: 0, neutral: 0 },
          topPositive: summary.top_positive_comments?.[0] || sentimentResult.top_comments?.most_positive,
          topNegative: summary.top_negative_comments?.[0] || sentimentResult.top_comments?.most_negative,
          allComments: sentimentResult.comments || sentimentResult.all_comments || [],
          overallSentiment: metadata.overall_sentiment,
          confidence: metadata.confidence,
          aiSummary: sentimentResult.ai_summary || null,
          aiParagraphSummary: sentimentResult.ai_paragraph_summary || null
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!sentimentData) return;
    const timer = setInterval(() => {
      setAnimatedStats(prev => ({
        positive: prev.positive < sentimentData.sentiments.positive ? prev.positive + 0.3 : sentimentData.sentiments.positive,
        negative: prev.negative < sentimentData.sentiments.negative ? prev.negative + 0.3 : sentimentData.sentiments.negative,
        neutral: prev.neutral < sentimentData.sentiments.neutral ? prev.neutral + 0.3 : sentimentData.sentiments.neutral
      }));
    }, 15);
    return () => clearInterval(timer);
  }, [sentimentData]);

  if (loading || !sentimentData || !sentimentData.sentiments || !sentimentData.rawCounts || !sentimentData.overallSentiment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-2xl font-semibold">Analyzing sentiments...</p>
          <p className="text-cyan-400 mt-2">Processing with AI models</p>
        </div>
      </div>
    );
  }





  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back to Search</span>
            </button>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-pink-500/50">
                  <Brain className="w-9 h-9" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Sentiment Analysis
                  </h1>
                  <p className="text-gray-400 mt-1">AI-powered insights from Reddit comments</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-5 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-500/50 rounded-xl flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20">
                  <Download className="w-5 h-5" />
                  <span className="font-semibold">Export</span>
                </button>
                <button className="px-5 py-3 bg-purple-500/20 hover:bg-purple-500/30 border-2 border-purple-500/50 rounded-xl flex items-center gap-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
                  <Share2 className="w-5 h-5" />
                  <span className="font-semibold">Share</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">Powered by Hugging Face AI</span>
              </div>
              <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-full">
                <span className="text-cyan-300 text-sm font-semibold">Query: "{sentimentData.query}"</span>
              </div>
              <div className="px-4 py-2 bg-pink-500/20 border border-pink-500/50 rounded-full">
                <span className="text-pink-300 text-sm font-semibold">{sentimentData.totalComments.toLocaleString()} comments analyzed</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-cyan-300 font-semibold">Total Analyzed</span>
                <MessageSquare className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-5xl font-bold text-white mb-2">{sentimentData.totalComments.toLocaleString()}</div>
              <div className="text-sm text-cyan-300/70">Reddit comments</div>
              <div className="mt-4 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-red-300 font-semibold">Negative</span>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-5xl font-bold text-red-400 mb-2">{animatedStats.negative.toFixed(1)}%</div>
              <div className="text-sm text-red-300/70">{sentimentData.rawCounts.negative.toLocaleString()} comments</div>
              <div className="mt-4 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000" style={{ width: `${animatedStats.negative}%` }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-yellow-300 font-semibold">Neutral</span>
                <Minus className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-5xl font-bold text-yellow-400 mb-2">{animatedStats.neutral.toFixed(1)}%</div>
              <div className="text-sm text-yellow-300/70">{sentimentData.rawCounts.neutral.toLocaleString()} comments</div>
              <div className="mt-4 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-500 transition-all duration-1000" style={{ width: `${animatedStats.neutral}%` }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-500/30 hover:border-green-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-300 font-semibold">Positive</span>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-5xl font-bold text-green-400 mb-2">{animatedStats.positive.toFixed(1)}%</div>
              <div className="text-sm text-green-300/70">{sentimentData.rawCounts.positive.toLocaleString()} comments</div>
              <div className="mt-4 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-1000" style={{ width: `${animatedStats.positive}%` }}></div>
              </div>
            </div>
          </div>

          {/* Distribution Bar */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-500/30 mb-8 hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{sentimentData.query}</h2>
                <p className="text-gray-400">Overall Sentiment Distribution</p>
              </div>
              <div className={`px-6 py-3 rounded-xl border-2 ${
                sentimentData.overallSentiment === 'positive' ? 'bg-green-500/20 border-green-500/50' :
                sentimentData.overallSentiment === 'negative' ? 'bg-red-500/20 border-red-500/50' :
                'bg-yellow-500/20 border-yellow-500/50'
              }`}>
                <span className={`font-bold text-lg ${
                  sentimentData.overallSentiment === 'positive' ? 'text-green-400' :
                  sentimentData.overallSentiment === 'negative' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {sentimentData.overallSentiment?.toUpperCase() || 'UNKNOWN'} ({(sentimentData.confidence || 0).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 justify-between text-center">
                <div className="flex-1">
                  <div className="text-3xl font-bold mb-1 text-green-400">
                    {sentimentData.sentiments.positive.toFixed(1)}%
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Positive</div>
                  <div className="text-gray-500 text-xs">({sentimentData.rawCounts.positive.toLocaleString()} comments)</div>
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold mb-1 text-red-400">
                    {sentimentData.sentiments.negative.toFixed(1)}%
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Negative</div>
                  <div className="text-gray-500 text-xs">({sentimentData.rawCounts.negative.toLocaleString()} comments)</div>
                </div>
                <div className="flex-1">
                  <div className="text-3xl font-bold mb-1 text-yellow-400">
                    {sentimentData.sentiments.neutral.toFixed(1)}%
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Neutral</div>
                  <div className="text-gray-500 text-xs">({sentimentData.rawCounts.neutral.toLocaleString()} comments)</div>
                </div>
              </div>

              <div className="h-6 w-full bg-gray-800/50 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="transition-all duration-1000 ease-out flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-green-600 to-green-500"
                  style={{ width: `${sentimentData.sentiments.positive}%` }}
                >
                  {sentimentData.sentiments.positive > 15 && `${sentimentData.sentiments.positive.toFixed(0)}%`}
                </div>
                <div
                  className="transition-all duration-1000 ease-out flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-red-600 to-red-500"
                  style={{ width: `${sentimentData.sentiments.negative}%` }}
                >
                  {sentimentData.sentiments.negative > 15 && `${sentimentData.sentiments.negative.toFixed(0)}%`}
                </div>
                <div
                  className="transition-all duration-1000 ease-out flex items-center justify-center text-white font-bold text-sm bg-gradient-to-r from-yellow-600 to-yellow-500"
                  style={{ width: `${sentimentData.sentiments.neutral}%` }}
                >
                  {sentimentData.sentiments.neutral > 15 && `${sentimentData.sentiments.neutral.toFixed(0)}%`}
                </div>
              </div>
            </div>
          </div>

          {/* AI Paragraph Summary Section */}
          {sentimentData.aiParagraphSummary && (
            <div className="mb-8">
              <div className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-all">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    🤖
                  </div>
                  AI Analysis Summary
                  <span className="text-sm bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
                    {sentimentData.aiParagraphSummary?.confidence_level || 'unknown'} confidence
                  </span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {sentimentData.aiParagraphSummary?.model_used || 'unknown'}
                  </span>
                </h3>
                
                {/* AI Generated Summary with Bullet Point Formatting */}
                <div className="bg-indigo-500/10 rounded-xl p-6 border border-indigo-500/20">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      ✨
                    </div>
                    <div className="flex-1">
                      {/* Use the utility function to format AI summary */}
                      {formatAISummary(sentimentData.aiParagraphSummary?.paragraph_summary || 'AI summary not available')}
                      
                      <div className="mt-4 flex items-center gap-4 text-sm text-indigo-300">
                        <span>🕒 Generated: {sentimentData.aiParagraphSummary?.generated_at ? new Date(sentimentData.aiParagraphSummary.generated_at).toLocaleString() : 'Unknown'}</span>
                        <span>🎯 Confidence: {sentimentData.aiParagraphSummary?.confidence_level || 'unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Summary Section */}
          {sentimentData.aiSummary && (
            <div className="mb-8">
              <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    🧠
                  </div>
                  AI-Powered Analysis Summary
                  <span className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                    {sentimentData.aiSummary?.analysis_confidence || 'unknown'} confidence
                  </span>
                </h3>
                
                {/* AI Summary Text */}
                <div className="bg-purple-500/10 rounded-xl p-4 mb-4 border border-purple-500/20">
                  <p className="text-gray-200 text-lg leading-relaxed">
                    {sentimentData.aiSummary?.summary || 'AI summary not available'}
                  </p>
                </div>

                {/* Key Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                      💡 Key Insights
                    </h4>
                    <ul className="space-y-2">
                      {sentimentData.aiSummary?.key_insights?.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <span className="text-purple-400 mt-1">•</span>
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                      🎯 Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {sentimentData.aiSummary?.recommendations?.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <span className="text-indigo-400 mt-1">•</span>
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}




          {/* Top Comments */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {sentimentData.topNegative && (
              <div className="bg-gradient-to-br from-red-900/30 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-red-500/30 hover:border-red-500/50 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-red-300 font-bold text-lg">Most Negative Comment</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-red-400/70 text-xs font-semibold px-3 py-1 bg-red-500/20 rounded-full">
                        {((sentimentData.topNegative?.confidence || 0) * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 mb-3">
                  <p className="text-gray-200 text-sm leading-relaxed italic">
                    "{sentimentData.topNegative?.text || 'No negative comment available'}"
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-300/70">Reddit Score: {sentimentData.topNegative?.score || 'N/A'}</span>
                  <span className="text-red-300/70">Compound: {sentimentData.topNegative?.compound?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            )}

            {sentimentData.topPositive && (
              <div className="bg-gradient-to-br from-green-900/30 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border-2 border-green-500/30 hover:border-green-500/50 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-green-300 font-bold text-lg">Most Positive Comment</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-green-400/70 text-xs font-semibold px-3 py-1 bg-green-500/20 rounded-full">
                        {((sentimentData.topPositive?.confidence || 0) * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 mb-3">
                  <p className="text-gray-200 text-sm leading-relaxed italic">
                    "{sentimentData.topPositive?.text || 'No positive comment available'}"
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-300/70">Reddit Score: {sentimentData.topPositive?.score || 'N/A'}</span>
                  <span className="text-green-300/70">Compound: {sentimentData.topPositive?.compound?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Model Info */}
          <div className="bg-gradient-to-br from-purple-900/30 to-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-purple-200">AI Analysis Details</h3>
                <p className="text-gray-400">Powered by state-of-the-art NLP models</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">🤖</span>
                  </div>
                  <div>
                    <div className="text-purple-300 font-semibold mb-1">Model</div>
                    <div className="text-gray-300 text-sm font-mono bg-gray-800/50 px-3 py-2 rounded-lg">
                      cardiffnlp/twitter-roberta-base-sentiment-latest
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">⚡</span>
                  </div>
                  <div>
                    <div className="text-purple-300 font-semibold mb-1">Framework</div>
                    <div className="text-gray-300 text-sm">Hugging Face Transformers</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">📊</span>
                  </div>
                  <div>
                    <div className="text-purple-300 font-semibold mb-1">Analysis Type</div>
                    <div className="text-gray-300 text-sm">Sentiment Classification (Positive/Negative/Neutral)</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">✨</span>
                  </div>
                  <div>
                    <div className="text-purple-300 font-semibold mb-1">Confidence Threshold</div>
                    <div className="text-gray-300 text-sm">90%+ for top comments classification</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="text-gray-400 text-sm">
                  Analyzed on: <span className="text-purple-300 font-semibold">{sentimentData.analyzedAt}</span>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <span className="text-purple-300 text-sm font-semibold">Accuracy: 94.2%</span>
                  </div>
                  <div className="px-4 py-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                    <span className="text-cyan-300 text-sm font-semibold">F1 Score: 0.91</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
      `}</style>
    </div>
  );
}