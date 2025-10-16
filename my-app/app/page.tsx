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

      {/* Overlay text */}
<div className="absolute inset-0 flex items-center justify-center text-[#7DF9FF] pointer-events-none">
        <SplitText
          text="REVU AI"
          className="text-5xl font-bold text-center pointer-events-auto"
          delay={100}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
        />
      </div>
    </main>
  );
}
