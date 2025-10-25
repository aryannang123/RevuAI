"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, testConnection } from "@/lib/auth";
import { LogIn } from "lucide-react";
import Iridescence from "@/components/Iridescence"; // ✅ your installed shader component

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* ✨ Iridescent Animated Background */}
      <div className="absolute inset-0 -z-10">
        <Iridescence
          color={[1.2, 1.0, 1.4]} // brighter glow
          mouseReact={false}
          amplitude={0.15}
          speed={1.0}
        />
      </div>

      {/* 🌈 Gradient fallback (in case WebGL fails) */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 via-purple-900 to-black -z-20" />

      {/* Floating accent glows */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* 💎 Glassmorphic Login Card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="relative bg-white/10 backdrop-blur-3xl border border-cyan-400/30 rounded-3xl shadow-[0_0_40px_-10px_rgba(6,182,212,0.4)] p-10 w-full max-w-md text-center animate-fade-in before:absolute before:inset-0 before:rounded-3xl before:p-[1px] before:bg-gradient-to-r before:from-cyan-400/50 before:to-purple-500/50 before:-z-10 before:blur-[1px]">

          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient mb-4">
            Rev AI
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Sign in to continue your AI analysis journey
          </p>

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

          <p className="mt-6 text-gray-400 text-sm">
            By signing in, you agree to our{" "}
            <span className="text-cyan-400 hover:underline cursor-pointer">Terms</span> &{" "}
            <span className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>

      {/* ✨ Animations */}
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
          0%,
          100% {
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
