"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

interface SentimentData {
  ai_summary?: {
    paragraph_summary: string;
    model_used: string;
    generated_at: string;
  };
  summary?: Record<string, number>;
  overall_sentiment?: string;
  total_analyzed?: number;
  top_comments?: {
    most_very_positive?: {
      text: string;
      confidence: number;
    };
    most_very_negative?: {
      text: string;
      confidence: number;
    };
  };
}

export default function AnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const query = sessionStorage.getItem("search_query");
    const redditData = sessionStorage.getItem("reddit_data");

    if (!query || !redditData) {
      router.push("/");
      return;
    }

    setSearchQuery(query);

    try {
      // Parse the Reddit data which now includes sentiment analysis and AI summary
      const parsedData = JSON.parse(redditData);

      // Check if we have sentiment analysis in the data
      if (parsedData.sentiment_analysis) {
        setSentimentData(parsedData.sentiment_analysis);
        setLoading(false);
      } else {
        // Fallback: fetch latest sentiment analysis from backend
        const backendUrl = `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000"
          }/api/sentiment/latest`;

        fetch(backendUrl)
          .then(async (res) => {
            const json = await res.json();
            setSentimentData(json);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Fetch error:", err);
            setLoading(false);
          });
      }
    } catch (err) {
      console.error("Error parsing Reddit data:", err);
      router.push("/");
    }
  }, [router]);

  // 🌀 Loading State
  if (loading || !sentimentData) {
    return (
      <main className="relative h-screen w-full flex items-center justify-center overflow-hidden text-white">
        {/* 🌈 Iridescent Background */}
        <div className="fixed top-0 left-0 w-screen h-screen -z-10">
          <Iridescence
            color={[0.4, 0.6, 1]}
            mouseReact={false}
            amplitude={0.1}
            speed={1.0}
          />
        </div>

        {/* Loader */}
        <div className="relative text-center z-10">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-2xl font-semibold">
            Analyzing sentiments...
          </p>
          <p className="text-cyan-300 mt-2">Processing with AI models</p>
        </div>
      </main>
    );
  }

  // ✅ After Loading
  const items = [
    { label: "Consumer", href: "#" },
    { label: "Developer", href: "#" },
  ];

  return (
    <main className="relative min-h-screen w-screen overflow-hidden text-white">
      {/* 🌈 Iridescent Background */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-50">
        <button
          onClick={() => router.push("/")}
          className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-6 py-3 hover:bg-white/20 transition-all duration-300"
        >
          <span className="text-white font-medium">← Back to Search</span>
        </button>
      </div>

      {/* 🧊 Glass Navbar (Top Right) */}
      <div className="absolute top-8 right-8 z-50">
        <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-8 py-2">
          <div
            style={{
              height: "40px",
              position: "relative",
              width: "auto",
            }}
          >
            <GooeyNav
              items={items}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={0}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>
        </div>
      </div>

      {/* 📊 Analysis Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Sentiment Analysis Results
            </h1>
            <p className="text-white/70 text-lg">
              Query: {searchQuery}
            </p>
          </div>

          {/* AI Summary Section */}
          {sentimentData?.ai_summary?.paragraph_summary && (
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                🤖 AI Summary
              </h2>
              <div className="text-white/90 leading-relaxed text-lg">
                {sentimentData.ai_summary.paragraph_summary}
              </div>
              <div className="mt-4 text-white/60 text-sm">
                Generated by {sentimentData.ai_summary?.model_used} • {new Date(sentimentData.ai_summary?.generated_at || '').toLocaleString()}
              </div>
            </div>
          )}

          {/* Sentiment Breakdown */}
          {sentimentData?.summary && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Overall Sentiment */}
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Overall Sentiment</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {sentimentData.overall_sentiment?.toUpperCase().replace('_', ' ')}
                </div>
                <div className="text-white/70">
                  {sentimentData.total_analyzed} comments analyzed
                </div>
              </div>

              {/* Sentiment Distribution */}
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(sentimentData.summary || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-white/90">
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                      <span>{typeof value === 'number' ? `${value.toFixed(1)}%` : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Comments */}
          {sentimentData?.top_comments && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Positive */}
              {sentimentData.top_comments.most_very_positive && (
                <div className="backdrop-blur-2xl bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-green-300 mb-4">Most Positive Comment</h3>
                  <div className="text-white/90 mb-3">
                    "{sentimentData.top_comments.most_very_positive.text}"
                  </div>
                  <div className="text-green-300/70 text-sm">
                    Confidence: {((sentimentData.top_comments.most_very_positive?.confidence || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Most Negative */}
              {sentimentData.top_comments.most_very_negative && (
                <div className="backdrop-blur-2xl bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-red-300 mb-4">Most Negative Comment</h3>
                  <div className="text-white/90 mb-3">
                    "{sentimentData.top_comments.most_very_negative.text}"
                  </div>
                  <div className="text-red-300/70 text-sm">
                    Confidence: {((sentimentData.top_comments.most_very_negative?.confidence || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </main>
  );
}
