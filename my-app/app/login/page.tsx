"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, testConnection } from "@/lib/auth";
import { Brain, Sparkles, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Background particle animation (same as home)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: Math.random() * 0.5 - 0.25,
        vy: Math.random() * 0.5 - 0.25,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${p.opacity})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      if (!result.connected) setError(`Connection failed: ${result.error}`);
    };
    checkConnection();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError);
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Navbar */}
      <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex space-x-8 bg-gray-900/40 backdrop-blur-md border border-cyan-500/20 rounded-2xl px-8 py-3 shadow-lg shadow-cyan-500/10">
        <a href="/" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          Home
        </a>
        <a href="#about" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          About
        </a>
        <a href="#contact" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          Contact
        </a>
      </nav>

      {/* Login Card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="bg-gray-900/70 backdrop-blur-2xl border border-cyan-500/20 rounded-3xl shadow-2xl shadow-cyan-500/10 p-10 w-full max-w-md text-center animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-cyan-500/50">
              <Brain className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient mb-4">
            Rev AI
          </h1>
          <p className="text-gray-400 text-lg mb-8">Sign in to continue your AI analysis journey</p>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:scale-105 hover:shadow-cyan-500/50 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-6 h-6" />
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="mt-6 text-gray-500 text-sm">
            By signing in, you agree to our{" "}
            <span className="text-cyan-400 hover:underline cursor-pointer">Terms</span> &{" "}
            <span className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
}
