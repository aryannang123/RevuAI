"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, TrendingUp, TrendingDown, Minus,
  MessageSquare, ArrowLeft, Download, Share2, Sparkles
} from 'lucide-react';

import SentimentGraphs from "@/components/SentimentGraphs"; // ✅ Import your graph component

export default function AnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [animatedStats, setAnimatedStats] = useState({ positive: 0, negative: 0, neutral: 0 });

  useEffect(() => {
    const query = sessionStorage.getItem('search_query');
    const redditData = sessionStorage.getItem('reddit_data');
    if (!query || !redditData) {
      router.push('/');
      return;
    }

    const data = JSON.parse(redditData);
    const backendUrl = `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000'}/api/sentiment/get-analysis/${encodeURIComponent(query)}`;

    fetch(backendUrl)
      .then(async res => {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          const metadata = json.metadata || json;
          const summary = json.summary || {};
          setSentimentData({
            query,
            totalComments: metadata.total_comments_analyzed || 0,
            analyzedAt: new Date(metadata.analyzed_at).toLocaleDateString(),
            sentiments: metadata.sentiment_breakdown || { positive: 0, negative: 0, neutral: 0 },
            rawCounts: metadata.raw_counts || { positive: 0, negative: 0, neutral: 0 },
            topPositive: summary.top_positive_comments?.[0] || json.top_comments?.most_positive,
            topNegative: summary.top_negative_comments?.[0] || json.top_comments?.most_negative,
            allComments: json.comments || [],
            overallSentiment: metadata.overall_sentiment,
            confidence: metadata.confidence,
            aiSummary: json.ai_summary || null,
            aiParagraphSummary: json.ai_paragraph_summary || null
          });
        } catch (err) {
          console.error('JSON parse error. Raw response was:', text);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
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

  if (loading || !sentimentData) {
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* ✅ New Graph Section inserted here */}
          <div className="my-10 bg-gray-900/60 rounded-2xl border border-purple-500/30 p-6 shadow-xl backdrop-blur-md hover:border-purple-400/50 transition-all">
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
              Visual Sentiment Breakdown
            </h2>
            <SentimentGraphs /> {/* <— Chart.js component */}
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
