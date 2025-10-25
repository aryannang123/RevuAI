"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { User, History, Search, Clock, ChevronRight, X } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SearchHistory {
  id: string;
  query: string;
  created_at: string;
  reddit_data: any;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSelect: (item: SearchHistory) => void;
}

export default function Sidebar({ isOpen, onClose, onSearchSelect }: SidebarProps) {
  const [user, setUser] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 Fetch user + history from Supabase
  useEffect(() => {
    const fetchUserAndHistory = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(userData.user);

        if (userData.user) {
          const { data, error } = await supabase
            .from("search_history")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });

          if (!error && data) setSearchHistory(data);
        }
      } catch (error) {
        console.error("Error fetching user or history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUserAndHistory();
    }
  }, [isOpen]);

  // Format “4h ago” timestamps
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-96 bg-white/10 backdrop-blur-2xl border-r border-white/20 z-50 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Account
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* User Info */}
              {user && (
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center gap-3 mb-4">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="text-white/60 text-sm">{user.email}</p>
                      <p className="text-white/60 text-xs">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}

              {/* Search History */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Search History
                </h3>

                {searchHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No searches yet</p>
                    <p className="text-white/40 text-sm">
                      Your search history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHistory.slice(0, 10).map((search) => (
                      <div
                        key={search.id}
                        onClick={() => {
                          // Save to session + navigate to /analysis
                          sessionStorage.setItem(
                            "reddit_data",
                            JSON.stringify(search.reddit_data)
                          );
                          sessionStorage.setItem("search_query", search.query);
                          onSearchSelect(search);
                          onClose();
                        }}
                        className="group p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                              {search.query}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-white/40" />
                              <p className="text-white/60 text-xs">
                                {formatDate(search.created_at)}
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                completed
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>
                    ))}

                    {searchHistory.length > 10 && (
                      <div className="text-center pt-2">
                        <p className="text-white/40 text-sm">
                          +{searchHistory.length - 10} more searches
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
