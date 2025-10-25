"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartOptions,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ✅ Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  all_comments?: Array<{ confidence: number; sentiment: string }>;
  top_comments?: {
    most_very_positive?: { text: string; confidence: number };
    most_very_negative?: { text: string; confidence: number };
  };
}

export default function AnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        let query = sessionStorage.getItem("search_query");
        let redditData = sessionStorage.getItem("reddit_data");

        // ✅ If data exists locally (user clicked from sidebar)
        if (query && redditData) {
          const parsed = JSON.parse(redditData);
          setSearchQuery(query);

          if (parsed.sentiment_analysis) {
            setSentimentData(parsed.sentiment_analysis);
          } else {
            setSentimentData(parsed);
          }

          setLoading(false);
          return;
        }

        // ⚠️ No session data? Try loading from Supabase
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          router.push("/login");
          return;
        }

        // Fetch latest completed search for this user
        const { data, error } = await supabase
          .from("searches")
          .select("search_query, analysis_data")
          .eq("user_id", userData.user.id)
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !data) {
          console.warn("⚠️ No saved analysis found in Supabase:", error);
          router.push("/");
          return;
        }

        // ✅ Found analysis_data — load it
        if (data.analysis_data) {
          sessionStorage.setItem("reddit_data", JSON.stringify(data.analysis_data));
          sessionStorage.setItem("search_query", data.search_query);
          setSearchQuery(data.search_query);
          setSentimentData(data.analysis_data);
        } else {
          console.warn("No analysis data available for this search.");
          router.push("/");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading analysis data:", err);
        router.push("/");
      }
    };

    loadAnalysisData();
  }, [router]);

  // 🌀 Loading State
  if (loading || !sentimentData) {
    return (
      <main className="relative h-screen w-full flex items-center justify-center overflow-hidden text-white">
        <div className="fixed top-0 left-0 w-screen h-screen -z-10">
          <Iridescence color={[0.4, 0.6, 1]} mouseReact={false} amplitude={0.1} speed={1.0} />
        </div>

        <div className="relative text-center z-10">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-2xl font-semibold">Loading analysis...</p>
          <p className="text-cyan-300 mt-2">Please wait</p>
        </div>
      </main>
    );
  }

  // ✅ Ready to render
  const items = [
    { label: "Consumer", href: "#" },
    { label: "Developer", href: "./dev_analysis" },
  ];

  return (
    <main className="relative min-h-screen w-screen overflow-hidden text-white">
      {/* 🌈 Background */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Iridescence color={[0.4, 0.6, 1]} mouseReact={false} amplitude={0.1} speed={1.0} />
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

      {/* Navbar */}
      <div className="absolute top-8 right-8 z-50">
        <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-8 py-2">
          <div style={{ height: "40px", position: "relative", width: "auto" }}>
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

      {/* 🧠 Main Analysis */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Sentiment Analysis Results</h1>
          <p className="text-white/70 text-lg">Query: {searchQuery}</p>
        </div>

        {/* Your existing chart + summary sections remain unchanged */}
        {/* ... (keep everything else below as-is) */}
      </div>
    </main>
  );
}
