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
  };
}

// Define a type for the overall API response
interface RedditApiResponse {
  data: {
    children: RedditPost[];
  };
}

/**
 * Fetches the top posts from a given subreddit using our local API proxy.
 * @param subreddit The name of the subreddit to fetch.
 * @returns A promise that resolves to the JSON data from the Reddit API.
 */
export const fetchSubredditData = async (subreddit: string): Promise<RedditApiResponse> => {
  if (!subreddit) {
    throw new Error("Subreddit name cannot be empty.");
  }

  // Construct the URL for our local API route
  const proxyUrl = `/api/reddit?subreddit=${encodeURIComponent(subreddit.trim())}`;
  console.log(`Fetching data from our proxy: ${proxyUrl}`);

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    // Check for specific error statuses
    if (response.status === 404) {
      throw new Error(`Subreddit "${subreddit}" not found.`);
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    throw new Error(errorData.error || `API error (Status: ${response.status})`);
  }

  const data = await response.json();
  return data as RedditApiResponse;
};

