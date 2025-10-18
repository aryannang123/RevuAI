// Define a type for the Reddit post data for better type safety
interface RedditPost {
  data: {
    title: string;
    author: string;
    selftext: string;
    ups: number;
    num_comments: number;
    permalink: string;
    url: string;
    subreddit: string; // Added subreddit to the post data
  };
}

// Define a type for the overall API response
interface RedditApiResponse {
  data: {
    children: RedditPost[];
  };
}

/**
 * Searches all of Reddit for a given keyword query.
 * @param query The search term to look for.
 * @returns A promise that resolves to the JSON data from the Reddit API.
 */
export const fetchRedditSearch = async (query: string): Promise<RedditApiResponse> => {
  if (!query) {
    throw new Error("Search query cannot be empty.");
  }

  // Construct the URL for our local API route, now using a 'query' param
  const proxyUrl = `/api/reddit?query=${encodeURIComponent(query.trim())}`;
  console.log(`Fetching data from our proxy: ${proxyUrl}`);

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    throw new Error(errorData.error || `API error (Status: ${response.status})`);
  }

  const data = await response.json();
  return data as RedditApiResponse;
};

