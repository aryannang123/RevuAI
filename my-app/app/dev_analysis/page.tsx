"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

interface SentimentData {
  developer_suggestions?: {
    developer_suggestions: string;
    model_used: string;
    generated_at: string;
  };
  total_analyzed?: number;
  overall_sentiment?: string;
}

export default function DevAnalysisPage() {
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
      const parsedData = JSON.parse(redditData);
      
      if (parsedData.sentiment_analysis) {
        console.log("🔍 Sentiment analysis data:", parsedData.sentiment_analysis);
        console.log("🛠️ Developer suggestions available:", !!parsedData.sentiment_analysis.developer_suggestions);
        setSentimentData(parsedData.sentiment_analysis);
        setLoading(false);
      } else {
        // Fallback: fetch latest sentiment analysis from backend
        const backendUrl = `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000"}/api/sentiment/latest`;
        
        fetch(backendUrl)
          .then(async (res) => {
            const json = await res.json();
            console.log("🔍 Fallback sentiment data:", json);
            console.log("🛠️ Developer suggestions in fallback:", !!json.developer_suggestions);
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

  const items = [
    { label: "← Back to analysis", href: "/analysis" },
  ];

  if (loading || !sentimentData) {
    return (
      <main className="relative h-screen w-full flex items-center justify-center overflow-hidden text-white">
        <div className="fixed top-0 left-0 w-screen h-screen -z-10">
          <Iridescence color={[0.4, 0.6, 1]} mouseReact={false} amplitude={0.1} speed={1.0} />
        </div>
        <div className="relative text-center z-10">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-2xl font-semibold">Loading developer insights...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-screen overflow-hidden text-white">
      {/* 🌈 Iridescent Background */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Iridescence color={[0.4, 0.6, 1]} mouseReact={false} amplitude={0.1} speed={1.0} />
      </div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-50">
        <button
          onClick={() => router.push("/analysis")}
          className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-6 py-3 hover:bg-white/20 transition-all duration-300"
        >
          <span className="text-white font-medium">← Back to Analysis</span>
        </button>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Developer Analysis</h1>
            <p className="text-white/70 text-lg">
              Technical insights and improvement suggestions for: {searchQuery}
            </p>
          </div>

          {/* Developer Suggestions Section */}
          {sentimentData?.developer_suggestions?.developer_suggestions ? (
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                🛠️ Developer Suggestions
              </h2>
              
              {(() => {
                const suggestions = sentimentData.developer_suggestions.developer_suggestions;
                
                // Parse the structured format
                const priorityMatch = suggestions.match(/\*\*PRIORITY FIXES:\*\*([\s\S]*?)(?=\*\*ENHANCEMENT OPPORTUNITIES:\*\*|$)/);
                const enhancementMatch = suggestions.match(/\*\*ENHANCEMENT OPPORTUNITIES:\*\*([\s\S]*?)$/);

                let priorityPoints: string[] = [];
                let enhancementPoints: string[] = [];

                if (priorityMatch) {
                  priorityPoints = priorityMatch[1]
                    .split(/•/)
                    .map(point => point.trim())
                    .filter(point => point.length > 10);
                }

                if (enhancementMatch) {
                  enhancementPoints = enhancementMatch[1]
                    .split(/•/)
                    .map(point => point.trim())
                    .filter(point => point.length > 10);
                }

                return (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Priority Fixes Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">!</span>
                        </div>
                        <h3 className="text-xl font-bold text-red-400">Priority Fixes</h3>
                      </div>

                      <div className="space-y-3">
                        {priorityPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2.5 flex-shrink-0"></div>
                            <p className="text-white/90 text-sm leading-relaxed">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Enhancement Opportunities Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">+</span>
                        </div>
                        <h3 className="text-xl font-bold text-blue-400">Enhancement Opportunities</h3>
                      </div>

                      <div className="space-y-3">
                        {enhancementPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2.5 flex-shrink-0"></div>
                            <p className="text-white/90 text-sm leading-relaxed">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-6 text-white/60 text-sm border-t border-white/10 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    <div className="text-cyan-400 text-xs font-medium">Comments Analyzed</div>
                    <div className="text-white text-sm font-bold">
                      {sentimentData.total_analyzed?.toLocaleString()}
                    </div>
                  </div>
                  <span>Generated by {sentimentData.developer_suggestions?.model_used}</span>
                </div>
                <span>{new Date(sentimentData.developer_suggestions?.generated_at || '').toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
              <div className="text-white/60 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Developer Suggestions Available</h3>
              <p className="text-white/70 mb-4">
                Developer suggestions are generated during sentiment analysis. This analysis was performed before the developer suggestions feature was added.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 To get developer suggestions:</strong> Perform a new search and the AI will automatically generate both user insights and developer recommendations.
                </p>
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
