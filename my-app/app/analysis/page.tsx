"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

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

      {/* ✨ Center Text */}
      <div className="h-full flex items-center justify-center text-5xl font-bold text-white/90 animate-fade-in">
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
