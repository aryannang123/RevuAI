import { NextResponse } from 'next/server';

// This function fetches an access token from Reddit's API
async function getAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Reddit API credentials are not configured in .env.local");
  }

  const authString = `${clientId}:${clientSecret}`;
  const encodedAuthString = Buffer.from(authString).toString('base64');

  const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedAuthString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RevuAI/0.1 by RevuAI Team'
    },
    body: `grant_type=password&username=${username}&password=${password}`
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to get Reddit access token:", response.status, errorBody);
    throw new Error('Failed to authenticate with Reddit API.');
  }

  const data = await response.json();
  return data.access_token;
}


export async function GET(request: Request) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Search query parameter is required' }, { status: 400 });
    }

    let allPosts: any[] = [];
    let after: string | null = null;
    const limit = 100;
    const maxPages = 10; // 10 pages * 100 posts/page = 1000 posts

    for (let i = 0; i < maxPages; i++) {
      let redditURL = `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query.trim())}&limit=${limit}&sort=relevance&t=all`;
      if (after) {
        redditURL += `&after=${after}`;
      }
      
      console.log(`Fetching page ${i + 1} from: ${redditURL}`);

      const response = await fetch(redditURL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'RevuAI/0.1 by RevuAI Team'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Reddit API Error: ${response.status}`, errorData);
        // Stop paginating if there's an error
        break;
      }

      const data = await response.json();
      const posts = data.data.children;
      if (posts.length > 0) {
        allPosts = allPosts.concat(posts);
      }

      after = data.data.after;
      if (!after) {
        // No more pages
        break;
      }
      
      // A delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    
    console.log(`Fetched a total of ${allPosts.length} posts.`);
    return NextResponse.json({ posts: allPosts });

  } catch (error: any) {
    console.error('Failed to fetch from Reddit API via proxy:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch from Reddit API' }, { status: 500 });
  }
}

