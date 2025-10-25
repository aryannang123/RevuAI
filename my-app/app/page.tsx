"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Search, Menu, Cpu, LineChart, Zap } from "lucide-react";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";
import Sidebar from "@/components/Sidebar";
import RevAiLoader from "@/components/RevAiLoader";
import { motion } from "framer-motion";

// 🧠 Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const IRIDESCENCE_COLOR = [0.3, 0.6, 1];

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState("Initializing...");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  // 🧠 Check Auth on load
  useEffect(() => {
    const verifyUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) router.push("/login");
      else {
        setUser(data.user);
        fetchHistory(data.user.id);
      }
    };
    verifyUser();
  }, [router]);

  // 🕓 Fetch user's saved searches
  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) setHistory(data);
  };

  // 💾 Save search (no duplicates, overwrites old)
  const saveSearch = async (query: string, data: any) => {
    if (!user) return;
    await supabase
      .from("search_history")
      .upsert(
        [
          {
            user_id: user.id,
            query,
            reddit_data: data,
          },
        ],
        {
          onConflict: "user_id,query",
          ignoreDuplicates: false, // ensures overwrite
        }
      );
    fetchHistory(user.id);
  };

  // 🚀 Handle Reddit Search
  const handleSearch = useCallback(async () => {
    const searchTerm = searchQuery.trim();
    if (!searchTerm) return setError("Please enter a search query");

    setError(null);
    setIsLoading(true);
    setProgressStage("Initializing...");
    setProgressPercent(0);

    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000";

      const response = await fetch(`${BACKEND_URL}/api/reddit/fetch-mass-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerm,
          target_comments: 2000,
          min_score: 2,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch Reddit data");
      const data = await response.json();

      // Store data in sessionStorage for /analysis page
      sessionStorage.setItem("reddit_data", JSON.stringify(data));
      sessionStorage.setItem("search_query", searchTerm);

      // Save in Supabase
      await saveSearch(searchTerm, data);

      // Animate water loader
      setProgressPercent(1);
      setProgressStage("Finalizing results");
      await new Promise((r) => setTimeout(r, 1500));
      setIsLoading(false);
      await new Promise((r) => setTimeout(r, 800));
      router.push("/analysis");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  }, [searchQuery, router, user]);

  // 📦 When user selects from history
  const handleHistorySelect = async (item: any) => {
    sessionStorage.setItem("reddit_data", JSON.stringify(item.reddit_data));
    sessionStorage.setItem("search_query", item.query);
    router.push("/analysis");
  };

  return (
    <>
      {/* 🌊 Water Loader */}
      <RevAiLoader
        isVisible={isLoading}
        currentStage={progressStage}
        progressValue={progressPercent}
      />

      <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden text-white">
        {/* 🌈 Background */}
        <div className="absolute inset-0 -z-20">
          <Iridescence
            color={IRIDESCENCE_COLOR}
            mouseReact={false}
            amplitude={0.1}
            speed={1.0}
          />
        </div>

        {/* 🧊 Navbar */}
        <div className="absolute top-8 z-30 w-full px-8">
          <div className="flex justify-center items-center relative">
            <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-10 py-2">
              <div style={{ height: "40px", position: "relative" }}>
                <GooeyNav
                  items={[
                    { label: "Home", href: "#" },
                    { label: "About", href: "./about" },
                    { label: "Contact", href: "./contact" },
                  ]}
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

            {user && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute left-0 backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl p-3 hover:bg-white/20 transition-all duration-300"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 🧠 Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6 mt-20"
        >
          <h1 className="text-7xl font-extrabold mb-4 drop-shadow-[0_0_35px_rgba(173,216,230,0.6)]">
            Rev AI
          </h1>
          <p className="text-cyan-100 font-semibold text-lg md:text-xl max-w-xl mx-auto mb-8">
            AI-powered Reddit sentiment analysis — uncover insights instantly
          </p>

          {/* 🔍 Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading) handleSearch();
            }}
            className="relative group max-w-2xl mx-auto"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-300/50 via-blue-300/50 to-purple-400/50 rounded-full blur-[3px] opacity-50 group-hover:opacity-70 transition duration-300" />
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black/60" />
              {isClient && (
                <input
                  type="text"
                  placeholder="Search Reddit for sentiment analysis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-16 pr-20 py-5 rounded-full bg-white/25 backdrop-blur-2xl border border-white/40 text-black font-semibold placeholder-black/50 focus:outline-none shadow-xl text-lg transition-all duration-300 disabled:opacity-60"
                />
              )}

              {/* ➤ Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/60 border-t-transparent" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="white"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {error && !isLoading && (
            <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-red-300 font-medium">{error}</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* 📂 Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchSelect={handleHistorySelect}
      />
    </>
  );
}
