"use client";

import LiquidChrome from "@/components/LiquidChrome";
import SplitText from "@/components/SplitText";
import GooeyNav from "@/components/GooeyNav";

export default function Home() {
  const handleAnimationComplete = () => {
    console.log("All letters have animated!");
  };

  const items = [
    { label: "Home", href: "#" },
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* Background */}
      <LiquidChrome />

      {/* ✅ Gooey Nav - top center, glassmorphic style */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto
                   rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20
                   shadow-[0_0_25px_rgba(255,255,255,0.15)] px-8 py-3"
        style={{
          height: "auto",
          width: "fit-content",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

      {/* Centered main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="transform -translate-y-8">
          <SplitText
            text="Rev AI"
            className="text-6xl font-bold text-center text-white pointer-events-auto"
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
