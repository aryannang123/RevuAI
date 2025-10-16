"use client";

import LiquidChrome from "@/components/LiquidChrome";
import SplitText from "@/components/SplitText";

export default function Home() {
  const handleAnimationComplete = () => {
    console.log("All letters have animated!");
  };

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Background effect */}
      <LiquidChrome />

      {/* Overlay content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Slightly lowered text */}
        <div className="transform -translate-y-8">
          <SplitText
            text="REVU AI"
            className="text-6xl font-bold text-center text-[#0D0D0D] pointer-events-auto"
            delay={100}
            duration={0.6}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-90px"
            textAlign="center"
            onLetterAnimationComplete={handleAnimationComplete}
          />
        </div>

        {/* Enlarged search bar */}
        <div className="mt-8 pointer-events-auto w-[420px] max-w-[90%]">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
          />
        </div>
      </div>
    </main>
  );
}
