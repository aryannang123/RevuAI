// Define a type for a single Reddit post
export interface RedditPost {
  kind: string;
  data: {
    title: string;
    author: string;
    selftext: string;
    ups: number;
    num_comments: number;
    permalink: string;
    url: string;
    subreddit: string;
    created_utc: number;
  };
}

// The API response will contain an array of posts
export interface RedditApiResponse {
  posts: RedditPost[];
}

/**
 * Searches all of Reddit for a given keyword query and fetches up to 1000 posts.
 * @param query The search term to look for.
 * @returns A promise that resolves to an object containing an array of Reddit posts.
 */
export const fetchRedditSearch = async (query: string): Promise<RedditApiResponse> => {
  if (!query) {
    throw new Error("Search query cannot be empty.");
  }

  const proxyUrl = `/api/reddit?query=${encodeURIComponent(query.trim())}`;
  console.log(`Fetching all search results from our proxy: ${proxyUrl}`);

  // This might take a while, so we increase the timeout.
  // Note: This is a client-side timeout and doesn't affect the server.
  const response = await fetch(proxyUrl, {
    // Adding a longer timeout is good practice for long-running requests,
    // though browser support and actual effect can vary.
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    if (response.status === 429) {
      throw new Error('Too many requests to the Reddit API. Please wait a moment before trying again.');
    }
    throw new Error(errorData.error || `API error (Status: ${response.status})`);
  }

  const data = await response.json();
  return data as RedditApiResponse;
};

