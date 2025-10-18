import { useState } from 'react';

export default function RedditDataFetcher() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMaximumData = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress({ current: 0, total: 0 });

    try {
      let allPosts = [];
      let after = null;
      const limit = 100;
      const maxPages = 10; // Reddit API typically allows ~1000 posts max

      // Fetch data page by page
      for (let i = 0; i < maxPages; i++) {
        setProgress({ current: i + 1, total: maxPages });
        
        let url = `/api/reddit?query=${encodeURIComponent(query.trim())}&limit=${limit}`;
        if (after) {
          url += `&after=${after}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.posts && data.posts.length > 0) {
          allPosts = allPosts.concat(data.posts);
          
          // Get the 'after' token for pagination
          const lastPost = data.posts[data.posts.length - 1];
          after = lastPost?.data?.name || null;
          
          if (!after) break; // No more pages
        } else {
          break; // No more data
        }

        // Delay to respect rate limits
        if (i < maxPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }

      if (allPosts.length === 0) {
        setError('No posts found for this query');
        setLoading(false);
        return;
      }

      // Process and structure the data
      const processedData = {
        metadata: {
          query: query,
          fetchedAt: new Date().toISOString(),
          totalPosts: allPosts.length,
          source: 'Reddit API'
        },
        posts: allPosts.map(post => ({
          id: post.data.id,
          title: post.data.title,
          author: post.data.author,
          subreddit: post.data.subreddit,
          content: post.data.selftext,
          upvotes: post.data.ups,
          commentCount: post.data.num_comments,
          url: `https://reddit.com${post.data.permalink}`,
          createdAt: new Date(post.data.created_utc * 1000).toISOString(),
          isVideo: post.data.is_video || false,
          mediaUrl: post.data.url
        }))
      };

      // Create and download the file
      downloadAsJSON(processedData, query);
      
      setSuccess(`Successfully fetched ${allPosts.length} posts! File downloaded.`);
      
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsJSON = (data, queryName) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `reddit_${queryName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Reddit Data Fetcher
        </h1>
        <p className="text-white/70 text-center mb-8">
          Fetch maximum posts from Reddit and download as JSON
        </p>

        <div className="space-y-6">
          {/* Search Input */}
          <div>
            <label className="block text-white/80 mb-2 font-medium">
              Search Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && fetchMaximumData()}
              placeholder="Enter search term (e.g., 'iPhone 16', 'Cyberpunk 2077')"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
            />
          </div>

          {/* Fetch Button */}
          <button
            onClick={fetchMaximumData}
            disabled={loading || !query.trim()}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/50"
          >
            {loading ? 'Fetching Data...' : 'Fetch & Download'}
          </button>

          {/* Progress Indicator */}
          {loading && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm">
                  Fetching page {progress.current} of {progress.total}
                </span>
                <span className="text-cyan-400 text-sm font-medium">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-white/60 text-xs mt-2 text-center">
                This may take 1-2 minutes to fetch maximum data...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works
            </h3>
            <ul className="text-white/70 text-sm space-y-1 ml-7">
              <li>• Fetches up to 1000 posts from Reddit</li>
              <li>• Automatically paginates through results</li>
              <li>• Downloads data as structured JSON</li>
              <li>• Includes metadata, content, and statistics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}