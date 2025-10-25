"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  CategoryScale,
  LinearScale,
  BarElement
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
  confidence_breakdown?: Record<string, number>;
  all_comments?: Array<{
    confidence: number;
    sentiment: string;
  }>;
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
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
        console.log("Sentiment data from session:", parsedData.sentiment_analysis);
        console.log("Has confidence_breakdown:", !!parsedData.sentiment_analysis.confidence_breakdown);
        setSentimentData(parsedData.sentiment_analysis);
        setLoading(false);
      } else {
        // Fallback: fetch latest sentiment analysis from backend
        const backendUrl = `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000"
          }/api/sentiment/latest`;

        fetch(backendUrl)
          .then(async (res) => {
            const json = await res.json();
            console.log("Sentiment data from API:", json);
            console.log("Has confidence_breakdown:", !!json.confidence_breakdown);
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
    { label: "Developer", href: "./dev_analysis" },
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



          {/* Top Charts Section */}
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

            {/* Emotion Breakdown - Horizontal Bar Chart */}
            {sentimentData?.dominant_emotion && (
              <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Emotion Breakdown</h3>
                <div className="h-64 flex items-center justify-center">
                  <Bar
                    data={{
                      labels: Object.keys(sentimentData.dominant_emotion || {}).map(emotion => {
                        const emoji = emotion === 'joy' ? '😊' :
                          emotion === 'anger' ? '😠' :
                            emotion === 'sadness' ? '😢' :
                              emotion === 'fear' ? '😨' :
                                emotion === 'surprise' ? '😲' :
                                  emotion === 'disgust' ? '🤢' :
                                    '😐';
                        return `${emoji} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
                      }),
                      datasets: [{
                        label: 'Emotion %',
                        data: Object.values(sentimentData.dominant_emotion || {}),
                        backgroundColor: Object.keys(sentimentData.dominant_emotion || {}).map(emotion => {
                          if (emotion === 'joy') return '#10B981'; // Green
                          if (emotion === 'anger') return '#EF4444'; // Red
                          if (emotion === 'sadness') return '#3B82F6'; // Blue
                          if (emotion === 'fear') return '#8B5CF6'; // Purple
                          if (emotion === 'surprise') return '#F59E0B'; // Yellow
                          if (emotion === 'disgust') return '#84CC16'; // Lime
                          if (emotion === 'neutral') return '#6B7280'; // Gray
                          return '#9CA3AF'; // Fallback
                        }),
                        borderColor: Object.keys(sentimentData.dominant_emotion || {}).map(emotion => {
                          if (emotion === 'joy') return '#059669';
                          if (emotion === 'anger') return '#DC2626';
                          if (emotion === 'sadness') return '#2563EB';
                          if (emotion === 'fear') return '#7C3AED';
                          if (emotion === 'surprise') return '#D97706';
                          if (emotion === 'disgust') return '#65A30D';
                          if (emotion === 'neutral') return '#4B5563';
                          return '#6B7280';
                        }),
                        borderWidth: 1,
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      indexAxis: 'y' as const,
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#F3F4F6',
                          bodyColor: '#F3F4F6',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          borderWidth: 1,
                          callbacks: {
                            label: function (context) {
                              const value = context.parsed?.x;
                              return `${value?.toFixed(1) || 0}%`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            color: '#F3F4F6',
                            stepSize: 20,
                            callback: function (value) {
                              return value + '%';
                            }
                          },
                          grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                          }
                        },
                        y: {
                          ticks: {
                            color: '#F3F4F6',
                            font: {
                              size: 12
                            }
                          },
                          grid: {
                            display: false
                          }
                        }
                      }
                    } as ChartOptions<'bar'>}
                  />
                </div>
              </div>
            )}
          </div>



          {/* AI Summary Section */}
          {sentimentData?.ai_summary?.paragraph_summary && (
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                🤖 AI Analysis Summary
              </h2>
              <div className="space-y-4">
                {(() => {
                  const summary = sentimentData.ai_summary.paragraph_summary;

                  // Split by common bullet point patterns and clean up
                  const points = summary
                    .split(/(?:\d+\.|\•|\-|\.)\s+/)
                    .map(point => point.trim())
                    .filter(point => point.length > 20) // Filter out very short fragments
                    .slice(0, 8); // Limit to 8 key points

                  return points.map((point, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white/90 leading-relaxed text-base">
                          {point.replace(/^[^\w]*/, '').trim()}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Summary Stats */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-cyan-400 text-sm font-medium">Overall Sentiment</div>
                  <div className="text-white text-xl font-bold capitalize">
                    {sentimentData.overall_sentiment?.replace('_', ' ')}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-cyan-400 text-sm font-medium">Comments Analyzed</div>
                  <div className="text-white text-xl font-bold">
                    {sentimentData.total_analyzed?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-cyan-400 text-sm font-medium">Dominant Emotion</div>
                  <div className="text-white text-xl font-bold capitalize">
                    {sentimentData.dominant_emotion ?
                      Object.entries(sentimentData.dominant_emotion)
                        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              <div className="mt-6 text-white/60 text-sm border-t border-white/10 pt-4 flex items-center justify-between">
                <span>Generated by {sentimentData.ai_summary?.model_used}</span>
                <span>{new Date(sentimentData.ai_summary?.generated_at || '').toLocaleString()}</span>
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
