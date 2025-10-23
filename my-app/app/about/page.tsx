"use client";

import Link from "next/link";
import Aurora from "./Aurora";

export default function AboutPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white">
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.4}
        amplitude={0.7}
        speed={0.35}
        className="opacity-70"
      />

      {/* Navbar */}
      <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex space-x-8 bg-gray-900/40 backdrop-blur-md border border-cyan-500/20 rounded-2xl px-8 py-3 shadow-lg shadow-cyan-500/10">
        <Link href="/" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          Home
        </Link>
        <Link href="/about" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          About
        </Link>
        <Link href="/contact" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          Contact
        </Link>
      </nav>

      {/* Content */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-40 pb-32 space-y-20 text-center">
        <div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            Turn Feedback into Fuel
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-3xl mx-auto">
            We bridge the gap between raw user data and decisive action — transforming feedback into clear, actionable intelligence.
          </p>
        </div>

        <div className="bg-gray-900/60 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-10 text-left shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all">
          <h2 className="text-3xl font-semibold text-cyan-300 mb-4">Our Mission</h2>
          <p className="text-white/85 leading-relaxed">
            Our platform democratizes access to insights — empowering every team to understand their customers, make faster decisions,
            and act on data with confidence.
          </p>
        </div>

        <div className="bg-gray-900/60 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-10 text-left shadow-2xl shadow-cyan-500/10">
          <h2 className="text-3xl font-semibold text-cyan-300 mb-4">Our Vision</h2>
          <p className="text-white/85 leading-relaxed">
            We imagine a world where every company can effortlessly interpret customer sentiment through AI, building better products and stronger relationships.
          </p>
        </div>
      </section>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
}
