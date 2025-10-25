"use client";

import Link from "next/link";
import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

export default function AboutPage() {
  const items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
      {/* 🌈 Iridescent Animated Background */}
      <div className="absolute inset-0 -z-20">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.1}
          speed={1.0}
        />
      </div>

      {/* 🧊 Glass Navbar */}
      <div className="absolute top-8 z-30 flex justify-center w-full">
        <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-10 py-2">
          <div style={{ height: "40px", position: "relative", width: "auto" }}>
            <GooeyNav
              items={items}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={1}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>
        </div>
      </div>

      {/* ✨ About Page Content */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24 space-y-20 text-center">
        {/* Hero Text */}
        <div>
          <h1 className="text-6xl font-extrabold text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
            Turn Feedback into Fuel
          </h1>

          <p className="mt-6 text-lg text-cyan-50/90 leading-relaxed max-w-3xl mx-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.2)]">
            We bridge the gap between raw user data and decisive action —
            transforming feedback into clear, actionable intelligence.
          </p>
        </div>

        {/* About Section */}
        <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl p-10 text-left shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all group">
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform">
            About Us
          </h2>
          <p className="text-gray-100 leading-relaxed tracking-wide">
            Accessible Feedback Analyzer is an AI-powered platform built to make
            understanding user feedback simple, clear, and actionable. It takes
            large amounts of raw text — from reviews, surveys, or social
            comments — and turns them into meaningful insights that anyone on
            your team can understand.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl p-10 text-left shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all group">
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform">
            Our Mission
          </h2>
          <p className="text-gray-100 leading-relaxed tracking-wide">
            We help teams move beyond just collecting feedback. Instead, we
            focus on uncovering the emotions and patterns behind what users say
            — highlighting what frustrates them, what delights them, and what
            truly needs fixing. Our goal is to turn every piece of feedback into
            a practical improvement opportunity.
          </p>
        </div>

        {/* Vision Section */}
        <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl p-10 text-left shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all group">
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-purple-300 to-pink-400 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform">
            Our Vision
          </h2>
          <p className="text-gray-100 leading-relaxed tracking-wide">
            We envision a world where understanding customer sentiment is
            effortless. Using AI, we want every company — from startups to
            enterprises — to make smarter, faster, and more empathetic
            decisions. By combining technology and human insight, we aim to help
            teams build better products and stronger relationships.
          </p>
        </div>

        {/* Philosophy Section */}
        <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl p-10 text-left shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all group">
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent mb-4 group-hover:scale-105 transition-transform">
            Our Philosophy
          </h2>
          <p className="text-gray-100 leading-relaxed tracking-wide">
            We believe that great products are born from great conversations.
            Accessible Feedback Analyzer exists to make those conversations
            meaningful — translating emotion into insight, and insight into
            action. Our mission is simple: help every team listen, learn, and
            improve continuously.
          </p>
        </div>
      </section>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </main>
  );
}
