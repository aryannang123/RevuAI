"use client";

import { useState, useCallback, useMemo } from "react";
import LiquidChrome from "@/components/LiquidChrome";
import SplitText from "@/components/SplitText";
import GooeyNav from "@/components/GooeyNav";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const handleAnimationComplete = useCallback(() => {
    console.log("All letters have animated!");
  }, []);

  const handleSearch = useCallback(() => {
    const input = document.getElementById("search-input") as HTMLInputElement;
    console.log("Search:", input.value);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const handleSidebarSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") console.log("Sidebar Search:", sidebarSearch);
    },
    [sidebarSearch]
  );

  // Use useMemo so that SplitText doesn’t re-render unnecessarily
  const splitTextMemo = useMemo(
    () => (
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
    ),
    [handleAnimationComplete]
  );

  const items = useMemo(
    () => [
      { label: "Home", href: "#" },
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
    ],
    []
  );

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <LiquidChrome />

      {/* Hamburger / Cross button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-6 left-6 z-50 flex flex-col justify-between w-8 h-6 cursor-pointer pointer-events-auto"
      >
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${
            sidebarOpen ? "rotate-45 translate-y-2.5" : ""
          }`}
        ></span>
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${
            sidebarOpen ? "opacity-0" : ""
          }`}
        ></span>
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${
            sidebarOpen ? "-rotate-45 -translate-y-2.5" : ""
          }`}
        ></span>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-lg border-r border-white/20 shadow-lg z-40 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col px-6 pt-24 space-y-8 text-white">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search history..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              onKeyDown={handleSidebarSearch}
              className="w-full px-4 py-2 pr-10 rounded-full 
                         bg-cyan-400/20 backdrop-blur-md border border-cyan-300/60 
                         text-white placeholder-white/70 
                         focus:outline-none focus:ring-2 focus:ring-cyan-400 
                         shadow-[0_0_25px_rgba(0,255,255,0.4)]
                         transition-all duration-300"
            />
            <button
              onClick={() => console.log("Sidebar search:", sidebarSearch)}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-cyan-300 hover:text-cyan-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
            </button>
          </div>

          {/* History items */}
          <nav className="flex flex-col mt-8 space-y-6 text-lg">
            <a href="#" className="hover:text-cyan-400 transition-colors">
              ASUS TUF A15
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              MACKBOOK M4
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              VALORANT
            </a>
          </nav>
        </div>
      </div>

      {/* Gooey Nav */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto
                   rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20
                   shadow-[0_0_25px_rgba(255,255,255,0.15)] px-8 py-3 flex items-center justify-center"
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

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="transform -translate-y-8">{splitTextMemo}</div>

        {/* Main Search bar */}
        <div className="mt-8 pointer-events-auto w-[420px] max-w-[90%] relative">
          <input
            id="search-input"
            type="text"
            placeholder="Search..."
            onKeyDown={handleKeyPress}
            className="w-full px-6 py-4 pr-14 rounded-full 
                       bg-white/10 backdrop-blur-md border border-cyan-300/50 
                       text-white placeholder-white/60 focus:outline-none 
                       focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 
                       shadow-[0_0_20px_rgba(0,255,255,0.3)]
                       text-lg transition-all duration-300"
          />
          <button
            onClick={handleSearch}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 bg-cyan-400/30 
                       rounded-full p-3 text-white shadow-[0_0_15px_rgba(0,255,255,0.3)]
                       hover:bg-cyan-400/50 transition-all duration-300 flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
