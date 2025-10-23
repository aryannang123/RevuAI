"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Brain, Search, Sparkles, TrendingUp, BarChart3, MessageSquare } from "lucide-react";

// Auth & Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

const getCurrentUser = async () => {
  if (!supabase) return { user: null, error: "Supabase not initialized." };
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

const signOut = async () => {
  if (!supabase) return { error: "Supabase not initialized." };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Animated particles background
const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: Math.random() * 0.5 - 0.25,
        vy: Math.random() * 0.5 - 0.25,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${particle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

// Loading states
const loadingStates = [
  { text: "Authenticating with Reddit API" },
  { text: "Searching for relevant posts" },
  { text: "Analyzing post engagement" },
  { text: "Fetching high-quality comments" },
  { text: "Processing comment threads" },
  { text: "Filtering by score threshold" },
  { text: "Running AI sentiment analysis" },
  { text: "Finalizing dataset" },
];

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchSearchHistory = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/searches?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.searches || []);
      }
    } catch (err) {
      console.error('Error fetching search history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
        setUser(user);
        await fetchSearchHistory(user.id);
      }
    };
    checkAuth();
  }, [router, fetchSearchHistory]);

  const saveToFile = useCallback(async (data: any, queryName: string) => {
    try {
      const fileName = `reddit_${queryName.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const response = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, data })
      });
      if (!response.ok) throw new Error('Failed to save file');
      return await response.json();
    } catch (err) {
      console.error('Error saving file:', err);
      throw err;
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${BACKEND_URL}/api/reddit/fetch-mass-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          target_comments: 10000,
          min_score: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const processedData = await response.json();
      await saveToFile(processedData, searchQuery);

      try {
        await fetch('/api/searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            userEmail: user.email,
            searchQuery: searchQuery
          })
        });
        await fetchSearchHistory(user.id);
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
      
      sessionStorage.setItem('reddit_data', JSON.stringify(processedData));
      sessionStorage.setItem('search_query', searchQuery);
      router.push('/analysis');
      
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'An error occurred while fetching data');
      setIsLoading(false);
    }
  }, [searchQuery, user, fetchSearchHistory, saveToFile, router]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch, isLoading]);

  if (isAuthenticated === null) {
    return (
      <main className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-2xl font-semibold">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <MultiStepLoader loadingStates={loadingStates} loading={isLoading} duration={4000} loop={false} />

      <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <ParticlesBackground />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>

        {/* Hamburger Menu */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed top-6 left-6 z-50 flex flex-col justify-between w-8 h-6 cursor-pointer group">
          <span className={`block h-1 w-full bg-cyan-400 rounded transition-all duration-300 group-hover:bg-cyan-300 ${sidebarOpen ? "rotate-45 translate-y-2.5" : ""}`}></span>
          <span className={`block h-1 w-full bg-cyan-400 rounded transition-all duration-300 group-hover:bg-cyan-300 ${sidebarOpen ? "opacity-0" : ""}`}></span>
          <span className={`block h-1 w-full bg-cyan-400 rounded transition-all duration-300 group-hover:bg-cyan-300 ${sidebarOpen ? "-rotate-45 -translate-y-2.5" : ""}`}></span>
        </button>

        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-r border-cyan-500/20 shadow-2xl shadow-cyan-500/10 z-40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex flex-col px-6 pt-20 space-y-6 h-full">
            {/* User Profile */}
            {user && (
              <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-xl p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg ring-2 ring-cyan-400/50">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-cyan-400/80 text-sm truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search History */}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Search History
                </h3>
                {loadingHistory && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                )}
              </div>
              
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {searchHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm italic">No searches yet</p>
                  </div>
                ) : (
                  searchHistory.map((search) => (
                    <div 
                      key={search.id} 
                      className="bg-gray-800/50 rounded-lg p-3 border border-cyan-500/10 hover:bg-gray-800/80 hover:border-cyan-500/30 transition-all cursor-pointer group"
                      onClick={() => setSearchQuery(search.search_query)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors" title={search.search_query}>
                            {search.search_query}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(search.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            search.status === 'completed' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
                            search.status === 'processing' ? 'bg-yellow-400 animate-pulse' : 
                            search.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                          }`}></span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Logout Button */}
            <div className="pb-6">
              <button 
                onClick={async () => { await signOut(); router.push("/login"); }} 
                className="w-full bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-400 px-4 py-3 rounded-lg border border-red-500/50 hover:border-red-400 transition-all duration-300 shadow-lg hover:shadow-red-500/20 flex items-center justify-center gap-2 font-semibold group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-cyan-500/50">
                <Brain className="w-9 h-9 text-white" />
              </div>
            </div>
            
            <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              Rev AI
            </h1>
            
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-4">
              AI-powered sentiment analysis of Reddit comments using advanced NLP models
            </p>
            
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Powered by Hugging Face
              </span>
              <span className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Real-time Analysis
              </span>
              <span className="px-4 py-2 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-400 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Interactive Charts
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) handleSearch(); }} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400" />
                <input 
                  type="text" 
                  placeholder="Search Reddit for sentiment analysis..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={handleKeyPress} 
                  disabled={isLoading} 
                  className="w-full pl-16 pr-16 py-5 rounded-2xl bg-gray-900/90 backdrop-blur-xl border-2 border-cyan-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 shadow-2xl text-lg transition-all duration-300 disabled:opacity-50" 
                />
                <button 
                  type="submit"
                  disabled={isLoading} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl p-3 text-white shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {error && !isLoading && (
              <div className="mt-6 animate-fade-in">
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-300 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all group">
                <Brain className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-semibold text-sm mb-1">AI Powered</h3>
                <p className="text-gray-500 text-xs">Advanced NLP models</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/10 hover:border-purple-500/30 transition-all group">
                <TrendingUp className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-semibold text-sm mb-1">Real-time</h3>
                <p className="text-gray-500 text-xs">Instant sentiment analysis</p>
              </div>
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-pink-500/10 hover:border-pink-500/30 transition-all group">
                <BarChart3 className="w-8 h-8 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-semibold text-sm mb-1">Visual</h3>
                <p className="text-gray-500 text-xs">Interactive charts</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </>
  );
}