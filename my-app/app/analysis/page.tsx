"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve data from sessionStorage
    const storedData = sessionStorage.getItem('reddit_data');
    const storedQuery = sessionStorage.getItem('search_query');

    if (storedData && storedQuery) {
      setData(JSON.parse(storedData));
      setSearchQuery(storedQuery);
      setLoading(false);
    } else {
      // If no data, redirect back to home
      router.push('/');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading analysis...</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const metadata = data.metadata || {};
  const comments = data.comments || [];

  // Calculate additional statistics
  const avgScore = metadata.averageScore || 0;
  const totalComments = metadata.totalComments || 0;
  const fetchTime = metadata.fetchTime || 0;
  const commentsPerSec = metadata.commentsPerSecond || 0;

  // Get top comments by score
  const topComments = [...comments]
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>

          <h1 className="text-5xl font-bold text-white mb-2">
            Analysis Results
          </h1>
          <p className="text-xl text-white/70">
            Search Query: <span className="text-cyan-400 font-semibold">"{searchQuery}"</span>
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Comments */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/70 text-sm font-medium">Total Comments</h3>
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-white">
              {totalComments.toLocaleString()}
            </p>
          </div>

          {/* Average Score */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/70 text-sm font-medium">Average Score</h3>
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-white">
              {avgScore.toLocaleString()}
            </p>
          </div>

          {/* Fetch Time */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/70 text-sm font-medium">Fetch Time</h3>
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-white">
              {fetchTime}s
            </p>
          </div>

          {/* Speed */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/70 text-sm font-medium">Comments/Second</h3>
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-4xl font-bold text-white">
              {commentsPerSec.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Metadata Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Fetch Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Min Score Filter:</span>
              <span className="text-white font-semibold">{metadata.minScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Target Comments:</span>
              <span className="text-white font-semibold">{metadata.targetComments?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Min Score Value:</span>
              <span className="text-white font-semibold">{metadata.minScoreValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Max Score Value:</span>
              <span className="text-white font-semibold">{metadata.maxScoreValue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Accounts Used:</span>
              <span className="text-white font-semibold">{metadata.accountsUsed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Fetched At:</span>
              <span className="text-white font-semibold">
                {metadata.fetchedAt ? new Date(metadata.fetchedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Comments Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-4">Top 10 Comments by Score</h2>
          <div className="space-y-4">
            {topComments.map((comment: any, index: number) => (
              <div
                key={comment.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-cyan-400 font-semibold text-sm">
                        Score: {comment.score.toLocaleString()}
                      </span>
                      <span className="text-white/50">•</span>
                      <span className="text-white/70 text-sm truncate">
                        Post: {comment.post_title}
                      </span>
                    </div>
                    <p className="text-white/90 text-sm leading-relaxed line-clamp-3">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Location Info */}
        <div className="mt-8 bg-green-500/20 border border-green-500/50 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-green-200 font-semibold text-lg">Data Saved Successfully!</h3>
          </div>
          <p className="text-green-300/80 text-sm">
            Check the <code className="bg-black/30 px-2 py-1 rounded">my-app/pre-process/</code> folder for the complete JSON file 📁
          </p>
        </div>
      </div>
    </div>
  );
}