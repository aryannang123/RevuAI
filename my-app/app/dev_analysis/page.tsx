"use client";

import React from "react";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

export default function DevAnalysisPage() {
  // Items for your GooeyNav (the same as the image)
  const items = [
    { label: "Consumer", href: "/analysis" },
    { label: "Developer", href: "/dev_analysis" },
  ];

  return (
    <main className="relative min-h-screen w-screen overflow-hidden text-white flex items-center justify-center">
      {/* 🌈 Iridescent Background */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      {/* 🧊 Glass Nav Bar (Top Right) */}
      <div className="absolute top-8 right-8 z-50">
        <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-8 py-2">
          <div style={{ height: "40px", position: "relative", width: "auto" }}>
            <GooeyNav
              items={items}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={1} // Developer is active
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>
        </div>
      </div>

      {/* 💡 Center Content */}
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl font-extrabold text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
          Developer Analysis
        </h1>
        <p className="mt-6 text-white/80 text-lg font-medium max-w-2xl mx-auto">
          Dive deep into technical insights powered by Rev AI.
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
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
