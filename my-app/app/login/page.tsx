"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, testConnection } from "@/lib/auth";
import { LogIn } from "lucide-react";
import Iridescence from "@/components/Iridescence"; // ✅ shader background

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
      {/* ✨ Animated Iridescent Background */}
      <div className="absolute inset-0 -z-10">
        <Iridescence
          color={[0.4, 0.6, 1]}
          mouseReact={false}
          amplitude={0.15}
          speed={1.0}
        />
      </div>

      {/* 🌈 Gradient fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 via-purple-900 to-black -z-20" />

      {/* 💠 Floating accent glows */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* 💎 Glassmorphic Login Card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
        <div className="group relative w-full max-w-md p-[2px] rounded-3xl bg-gradient-to-r from-cyan-400/40 via-teal-400/40 to-purple-500/40">
          <div className="relative bg-white/10 backdrop-blur-2xl border border-cyan-400/40 rounded-3xl shadow-[0_0_35px_-10px_rgba(34,211,238,0.5)] p-10 text-center transition-all duration-500 group-hover:shadow-[0_0_50px_-10px_rgba(34,211,238,0.8)]">
            <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">
              Rev AI
            </h1>
            <p className="text-white/90 font-semibold text-lg mb-8">
              Sign in to continue your AI analysis journey
            </p>

            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/60 text-white font-semibold px-4 py-3 rounded-xl text-sm shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-transparent border border-cyan-400/60 hover:border-cyan-300/90 hover:shadow-[0_0_25px_rgba(34,211,238,0.8)] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-6 h-6" />
              {loading ? "Signing in..." : "Continue with Google"}
            </button>

            <p className="mt-6 text-white/70 text-sm font-medium">
              By signing in, you agree to our{" "}
              <span className="text-cyan-300 hover:underline cursor-pointer font-semibold">Terms</span> &{" "}
              <span className="text-cyan-300 hover:underline cursor-pointer font-semibold">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ✨ Animations */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
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
