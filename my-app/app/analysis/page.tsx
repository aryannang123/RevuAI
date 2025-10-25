"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";

export default function AnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<any>(null);

  useEffect(() => {
    const query = sessionStorage.getItem("search_query");
    const redditData = sessionStorage.getItem("reddit_data");
    if (!query || !redditData) {
      router.push("/");
      return;
    }

    const backendUrl = `${
      process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:5000"
    }/api/sentiment/get-analysis/${encodeURIComponent(query)}`;

    fetch(backendUrl)
      .then(async (res) => {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setSentimentData(json);
        } catch (err) {
          console.error("JSON parse error. Raw response was:", text);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [router]);

  if (loading || !sentimentData) {
    return (
      <main className="relative h-screen w-full flex items-center justify-center overflow-hidden text-white">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
        <div className="relative text-center z-10">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-2xl font-semibold">Analyzing sentiments...</p>
          <p className="text-cyan-300 mt-2">Processing with AI models</p>
        </div>
      </main>
    );
  }

  // ✅ Displayed after loading finishes — buttons on top-right
  return (
    <main className="relative h-screen w-full overflow-hidden text-white">
      {/* 🌈 Iridescent Background */}
      <div className="absolute inset-0 -z-10">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      {/* 🧊 Top-right Glass Buttons */}
      <div className="absolute top-6 right-8 z-20 flex gap-4 animate-fade-in">
        <button className="px-6 py-2 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 text-white font-semibold shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:bg-white/25 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300">
          Consumer
        </button>
        <button className="px-6 py-2 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 text-white font-semibold shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:bg-white/25 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300">
          Developer
        </button>
      </div>

      {/* Center message or space for future content */}
      <div className="h-full flex items-center justify-center text-4xl font-bold text-white/80 animate-fade-in">
        Choose Your Portal
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
