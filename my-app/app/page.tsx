"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Brain, Search, Sparkles } from "lucide-react";
import Iridescence from "../components/Iridescence"; // ✅ background component

// =============================
// 🔐 Supabase Setup
// =============================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch {
    return null;
  }
};

// =============================
// 🧠 Main Component
// =============================
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadingStates = [
    { text: "Authenticating with Reddit API" },
    { text: "Fetching subreddit data" },
    { text: "Analyzing sentiment using Hugging Face" },
    { text: "Preparing visual insights" },
    { text: "Finalizing results" },
  ];

  // =============================
  // 🔑 Authentication Check
  // =============================
  useEffect(() => {
    const verifyUser = async () => {
      const u = await getCurrentUser();
      if (!u) router.push("/login");
      else setUser(u);
    };
    verifyUser();
  }, [router]);

  // =============================
  // 🔍 Reddit Search Logic
  // =============================
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000";

      const response = await fetch(`${BACKEND_URL}/api/reddit/fetch-mass-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          target_comments: 10000,
          min_score: 5,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch Reddit data");
      const processedData = await response.json();

      sessionStorage.setItem("reddit_data", JSON.stringify(processedData));
      sessionStorage.setItem("search_query", searchQuery);

      router.push("/analysis");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  }, [searchQuery, router]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSearch();
    }
  };

  // =============================
  // 🎨 UI
  // =============================
  return (
    <>
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isLoading}
        duration={3500}
        loop={false}
      />

      <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden text-white">
        {/* 🌈 Iridescent Animated Background */}
        <div className="absolute inset-0 -z-10">
          <Iridescence
            color={[0.3, 0.6, 1]} // 💎 Neo Cyan Violet — balanced futuristic glow
            mouseReact={false}
            amplitude={0.1}
            speed={1.0}
          />
        </div>

        {/* 🌓 Subtle Dark Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-radial from-black/30 via-black/20 to-transparent -z-5"></div>

        {/* 🧠 Hero Section */}
        <div className="relative z-10 text-center px-6 animate-fade-in">
          {/* Title */}
          <h1 className="text-7xl font-extrabold mb-4 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
            Rev AI
          </h1>

          {/* Subtitle */}
          <p className="text-white font-semibold text-lg md:text-xl max-w-xl mx-auto mb-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
            AI-powered Reddit sentiment analysis — uncover insights instantly
          </p>

          {/* 🔍 Frosted Glass Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading) handleSearch();
            }}
            className="relative group max-w-2xl mx-auto"
          >
            {/* Outer glow border */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-white/40 via-white/20 to-white/10 rounded-2xl blur-sm opacity-40 group-hover:opacity-60 transition duration-300"></div>

            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/70" />
              <input
                type="text"
                placeholder="Search Reddit for sentiment analysis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="w-full pl-16 pr-16 py-5 rounded-2xl bg-white/30 backdrop-blur-2xl border border-white/50 text-black font-semibold placeholder-black/50 focus:outline-none focus:border-black/40 focus:ring-4 focus:ring-black/10 shadow-xl text-lg transition-all duration-300 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl p-3 text-white shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Sparkles className="w-6 h-6" />
                )}
              </button>
            </div>
          </form>

          {/* ❌ Error Message */}
          {error && !isLoading && (
            <div className="mt-6 animate-fade-in">
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ✨ Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
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
    </>
  );
}
