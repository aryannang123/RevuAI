"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function RevAiLoader({
  isVisible,
  currentStage,
  progressValue,
}: {
  isVisible: boolean;
  currentStage?: string;
  progressValue?: number;
}) {
  const steps = [
    "Authenticating with Reddit API",
    "Fetching subreddit data",
    "Analyzing sentiment using Hugging Face",
    "Preparing visual insights",
    "Finalizing results",
  ];

  const [completed, setCompleted] = useState<number>(0);

  useEffect(() => {
    if (!currentStage) return;
    if (currentStage.includes("Auth")) setCompleted(0);
    else if (currentStage.includes("Fetch")) setCompleted(1);
    else if (currentStage.includes("Analyze")) setCompleted(2);
    else if (currentStage.includes("Preparing")) setCompleted(3);
    else if (currentStage.includes("Final")) setCompleted(4);
    else if (currentStage.includes("Complete")) setCompleted(steps.length);
  }, [currentStage]);

  const fillPercent = Math.min(Math.max(progressValue || 0, 0), 1) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="rev-ai-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.9,
            filter: "blur(8px)",
            transition: { duration: 1.2, ease: "easeInOut" },
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed inset-0 flex flex-col items-center justify-center backdrop-blur-[40px] bg-white/5 text-white font-mono z-50"
        >
          {/* Background halo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />

          {/* 🌊 3D Liquid Fill Loader */}
          <div className="relative mb-10">
            <div className="liquid-container">
              <div
                className="liquid"
                style={{
                  transform: `translateY(${100 - fillPercent}%)`,
                }}
              >
                <div className="wave"></div>
                <div className="wave wave2"></div>
              </div>
              <div className="liquid-overlay"></div>
            </div>
          </div>

          {/* Step tracker */}
          <div className="flex flex-col gap-2 text-sm sm:text-base">
            {steps.map((text, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 transition-all duration-300"
                animate={{
                  opacity: i <= completed ? 1 : 0.3,
                  color:
                    i === completed
                      ? "rgba(0,255,255,1)"
                      : i < completed
                      ? "rgba(0,255,150,0.8)"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                {i < completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border ${
                      i === completed
                        ? "border-cyan-400 animate-pulse"
                        : "border-white/40"
                    }`}
                  />
                )}
                <span
                  className={`${
                    i === completed
                      ? "font-semibold drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                      : ""
                  }`}
                >
                  {text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div
            className="absolute bottom-6 text-xs text-cyan-100/60 tracking-widest"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            REV AI Neural Analyzer v4.3
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
