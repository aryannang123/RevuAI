"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchRedditSearch, RedditPost } from '../../lib/reddit';

function ResultsPageComponent() {
  const searchParams = useSearchParams();
  const [redditData, setRedditData] = useState<RedditPost[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const query = searchParams.get('q');
    setSearchQuery(query);

    if (query) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchRedditSearch(query);
          if (data.posts && data.posts.length > 0) {
            setRedditData(data.posts);
          } else {
            setError("No posts found for your query.");
          }
        } catch (e: any) {
          setError(e.message);
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setError("No search query provided. Please perform a search first.");
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleDownload = () => {
    if (!redditData || !searchQuery) return;

    const jsonString = JSON.stringify(redditData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${searchQuery.replace(/\s+/g, '_')}_reddit_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="relative min-h-screen w-full bg-black text-white p-8 flex flex-col items-center">
        <div className="w-full max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-cyan-300">Search Results</h1>
                    {searchQuery && <p className="text-white/70">Showing results for: "{searchQuery}"</p>}
                </div>
                <div>
                    <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2 rounded-lg border border-white/30 transition-all duration-300 mr-4">
                      New Search
                    </Link>
                    <button
                        onClick={handleDownload}
                        disabled={!redditData || isLoading}
                        className="bg-cyan-500/80 hover:bg-cyan-500/100 text-black font-bold px-6 py-2 rounded-lg border border-cyan-300/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Download JSON
                    </button>
                </div>
            </div>

            <div className="p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 w-full h-[75vh] overflow-y-auto shadow-lg">
              {isLoading && <p className="text-white/60 text-center p-8 animate-pulse">Fetching up to 1000 posts...</p>}
              {error && <p className="text-red-400 text-center p-8">{error}</p>}
              {redditData && !isLoading && (
                <pre className="text-xs whitespace-pre-wrap text-white/90 p-4">
                  {JSON.stringify(redditData, null, 2)}
                </pre>
              )}
            </div>
        </div>
    </main>
  );
}


export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="bg-black text-white h-screen flex items-center justify-center">Loading...</div>}>
      <ResultsPageComponent />
    </Suspense>
  )
}
