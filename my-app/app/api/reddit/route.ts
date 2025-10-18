import { NextResponse } from 'next/server';

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
    const after = searchParams.get('after');
    const limit = searchParams.get('limit') || '100';
    const timeFilter = searchParams.get('t') || 'all';
    const sort = searchParams.get('sort') || 'relevance';

    if (!query) {
      return NextResponse.json({ error: 'Search query parameter is required' }, { status: 400 });
    }

    let redditURL = `https://oauth.reddit.com/search.json?q=${encodeURIComponent(query.trim())}&limit=${limit}&sort=${sort}&t=${timeFilter}&raw_json=1`;
    
    if (after) {
      redditURL += `&after=${after}`;
    }
    
    console.log(`Fetching: sort=${sort}, t=${timeFilter}, after=${after || 'none'}`);

    const response = await fetch(redditURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RevuAI/0.1 by RevuAI Team'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Reddit API Error: ${response.status}`, errorData);
      return NextResponse.json({ 
        error: `Reddit API error: ${response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log(`✓ Returned ${data.data.children.length} posts, next after: ${data.data.after || 'none'}`);
    
    return NextResponse.json({ 
      posts: data.data.children,
      after: data.data.after,
      before: data.data.before,
      dist: data.data.dist,
      count: data.data.children.length
    });

  } catch (error: any) {
    console.error('Failed to fetch from Reddit API:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch from Reddit API' 
    }, { status: 500 });
  }
}