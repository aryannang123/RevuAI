"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import LiquidChrome from "@/components/LiquidChrome";
import SplitText from "@/components/SplitText";
import GooeyNav from "@/components/GooeyNav";
import { fetchRedditSearch } from "@/lib/reddit";


export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [user, setUser] = useState<any>(null);

  // --- MODIFICATIONS FOR GLOBAL SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [redditData, setRedditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery) {
      setError("Please enter a search term.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRedditData(null);

    try {
      const data = await fetchRedditSearch(searchQuery);
      
      console.log("--- Global Reddit Search API Response ---");
      console.log(data);
      console.log("---------------------------------------");

      setRedditData(data);

    } catch (e: any) {
      console.error("Failed to fetch from Reddit API:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]); 

  // --- END OF MODIFICATIONS ---
    const handleAnimationComplete = useCallback(() => {;
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
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    []
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { getCurrentUser } = await import("@/lib/auth");
      const { user } = await getCurrentUser();

      if (!user) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
        setUser(user);
      }
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <main className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <LiquidChrome />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-6 left-6 z-50 flex flex-col justify-between w-8 h-6 cursor-pointer pointer-events-auto"
      >
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "rotate-45 translate-y-2.5" : ""
            }`}
        ></span>
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "opacity-0" : ""
            }`}
        ></span>
        <span
          className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "-rotate-45 -translate-y-2.5" : ""
            }`}
        ></span>
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-lg border-r border-white/20 shadow-lg z-40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col px-6 pt-20 space-y-6 text-white h-full">
          {user && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {user.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-white/60 text-xs truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-white/80 text-sm font-medium">Search History</h3>
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex flex-col space-y-3 text-sm flex-1">
            <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">Nothing Phone 2</a>
            <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">Cyberpunk 2077</a>
            <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">iPhone 16</a>
          </nav>

          <div className="mt-auto pb-6">
            <button
              onClick={async () => {
                const { signOut } = await import("@/lib/auth");
                await signOut();
                router.push("/login");
              }}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-3 rounded-lg border border-red-500/50 transition-all duration-300 shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_25px_rgba(255,0,0,0.4)] flex items-center justify-center gap-2 text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

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

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-24">
        <div className="transform -translate-y-8">{splitTextMemo}</div>

        <div className="mt-8 pointer-events-auto w-[420px] max-w-[90%] relative">
          <input
            id="search-input"
            type="text"
            placeholder="Search all of Reddit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 w-full max-w-2xl h-72 pointer-events-auto text-white overflow-y-auto shadow-lg">
          <h2 className="text-lg font-bold mb-2 text-cyan-300 sticky top-0 bg-black/30 backdrop-blur-sm -m-4 p-4 rounded-t-2xl z-10">Global Reddit Search Results</h2>
          <div className="pt-2">
            {isLoading && <p className="text-white/80">Searching Reddit...</p>}
            {error && <p className="text-red-400">{error}</p>}
            {redditData && (
              <pre className="text-xs whitespace-pre-wrap text-white/90">
                {JSON.stringify(redditData, null, 2)}
              </pre>
            )}
            {!isLoading && !error && !redditData && (
              <p className="text-white/60">Enter a keyword to search all of Reddit. The raw JSON response will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

