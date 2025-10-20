// reddit-fetcher.jsx
// UPDATED VERSION - Calls Python backend instead of Next.js API routes

import { useState } from 'react';

export default function RedditDataFetcher() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [abortController, setAbortController] = useState(null);

  // ⚠️ IMPORTANT: Change this to your Python backend URL
  // For production, use your deployed Python backend URL
  const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000';

  const fetchOptimizedData = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError('');
    setSuccess('');
    setProgress({ current: 0, total: 7, stage: 'Sending request to Python backend' });

    try {
      // ✨ NEW: Call Python backend instead of Next.js API routes
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/reddit/fetch-optimized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          num_posts: 35,
          comments_per_post: 143
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data from Python backend');
      }

      setProgress({ current: 6, total: 7, stage: 'Processing response' });

      const feedbackData = await response.json();

      setProgress({ current: 7, total: 7, stage: 'Downloading file' });

      // Download as JSON
      downloadAsJSON(feedbackData, query);

      const totalFeedback = feedbackData.metadata.totalComments + feedbackData.metadata.totalPosts;
      setSuccess(
        `✅ Successfully fetched ${feedbackData.metadata.totalPosts} high-engagement posts ` +
        `with ${feedbackData.metadata.totalComments} comments (${totalFeedback} total feedback items)!`
      );

    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Fetch cancelled by user');
      } else {
        setError(err.message || 'An error occurred while fetching data');
        console.error('Fetch error:', err);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const downloadAsJSON = (data, queryName) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reddit_feedback_${queryName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Reddit Data Fetcher</h2>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Backend:</strong> Python Flask ({PYTHON_BACKEND_URL})
        </p>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Fetches 35 high-engagement posts with ~143 top comments each for sentiment analysis. 
        Optimized: 85% fewer API calls, 3-4x faster (30-60 seconds).
      </p>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query (e.g., 'iPhone 15')"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <button
        onClick={fetchOptimizedData}
        disabled={loading || !query.trim()}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mb-2"
      >
        {loading ? 'Fetching Data...' : 'Fetch Reddit Data'}
      </button>

      {loading && (
        <div className="mb-4">
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{progress.stage}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
          <p className="text-xs mt-2">Check my-app/pre-process/ folder 📁</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Estimated time: 30-60 seconds
      </p>
    </div>
  );
}
