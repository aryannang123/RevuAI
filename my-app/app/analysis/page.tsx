"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

interface SentimentData {
  ai_summary?: {
    paragraph_summary: string;
    model_used: string;
    generated_at: string;
  };
  summary?: Record<string, number>;
  overall_sentiment?: string;
  total_analyzed?: number;
  dominant_emotion?: Record<string, number>;
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

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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
    { label: "Developer", href: "" },
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



          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Sentiment Distribution - Pie Chart */}
            {sentimentData?.summary && (
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Sentiment Distribution</h3>
                <div className="h-64 flex items-center justify-center">
                  <Pie
                    data={{
                      labels: Object.keys(sentimentData.summary || {}).map(key =>
                        key.replace('_', ' ').split(' ').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')
                      ),
                      datasets: [{
                        data: Object.values(sentimentData.summary || {}),
                        backgroundColor: Object.keys(sentimentData.summary || {}).map(sentiment => {
                          if (sentiment === 'very_positive') return '#065F46'; // Dark green
                          if (sentiment === 'positive') return '#10B981'; // Green
                          if (sentiment === 'neutral') return '#F97316'; // Orange
                          if (sentiment === 'negative') return '#EF4444'; // Red
                          if (sentiment === 'very_negative') return '#7F1D1D'; // Dark red
                          return '#9CA3AF'; // Fallback gray
                        }),
                        borderColor: Object.keys(sentimentData.summary || {}).map(sentiment => {
                          if (sentiment === 'very_positive') return '#064E3B';
                          if (sentiment === 'positive') return '#059669';
                          if (sentiment === 'neutral') return '#EA580C';
                          if (sentiment === 'negative') return '#DC2626';
                          if (sentiment === 'very_negative') return '#450A0A';
                          return '#6B7280';
                        }),
                        borderWidth: 2,
                        hoverBackgroundColor: Object.keys(sentimentData.summary || {}).map(sentiment => {
                          if (sentiment === 'very_positive') return '#064E3B';
                          if (sentiment === 'positive') return '#059669';
                          if (sentiment === 'neutral') return '#EA580C';
                          if (sentiment === 'negative') return '#DC2626';
                          if (sentiment === 'very_negative') return '#450A0A';
                          return '#6B7280';
                        }),
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: '#F3F4F6',
                            font: {
                              size: 12
                            },
                            padding: 15,
                            usePointStyle: true,
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#F3F4F6',
                          bodyColor: '#F3F4F6',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          callbacks: {
                            label: function (context) {
                              const value = context.parsed;
                              return `${context.label}: ${value.toFixed(1)}%`;
                            }
                          }
                        }
                      }
                    } as ChartOptions<'pie'>}
                  />
                </div>
              </div>
            )}

            {/* Emotion Breakdown */}
            {sentimentData?.dominant_emotion && (
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Emotion Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(sentimentData.dominant_emotion || {}).map(([emotion, percentage]) => (
                    <div key={emotion} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {emotion === 'joy' ? '😊' :
                            emotion === 'anger' ? '😠' :
                              emotion === 'sadness' ? '😢' :
                                emotion === 'fear' ? '😨' :
                                  emotion === 'surprise' ? '😲' :
                                    emotion === 'disgust' ? '🤢' :
                                      '😐'}
                        </span>
                        <span className="capitalize text-white/90 font-medium">{emotion}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${typeof percentage === 'number' ? percentage : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-white/90 font-semibold min-w-[3rem] text-right">
                          {typeof percentage === 'number' ? `${percentage.toFixed(1)}%` : String(percentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Summary Section - Moved Below */}
          {sentimentData?.ai_summary?.paragraph_summary && (
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                🤖 AI Summary
              </h2>
              <div className="text-white/90 leading-relaxed text-lg">
                {sentimentData.ai_summary.paragraph_summary
                  .split(/(?:\d+\.|\•|\-)\s+/)
                  .filter(point => point.trim().length > 0)
                  .map((point, index) => (
                    <div key={index} className="mb-4 flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-3 flex-shrink-0"></div>
                      <div className="text-white/90">{point.trim()}</div>
                    </div>
                  ))}
              </div>
              <div className="mt-6 text-white/60 text-sm border-t border-white/10 pt-4">
                Generated by {sentimentData.ai_summary?.model_used} • {new Date(sentimentData.ai_summary?.generated_at || '').toLocaleString()}
              </div>
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
