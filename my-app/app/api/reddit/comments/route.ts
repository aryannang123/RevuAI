// Create new file: my-app/app/api/reddit/comments/route.ts
// This fetches comments for a specific post

import { NextResponse } from 'next/server';

async function getAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Reddit API credentials are not configured");
  }

  const authString = `${clientId}:${clientSecret}`;
  const encodedAuthString = Buffer.from(authString).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedAuthString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RevuAI/0.1 by RevuAI Team'
    },
    body: `grant_type=password&username=${username}&password=${password}`
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with Reddit API');
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: Request) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);
    const permalink = searchParams.get('permalink');
    const limit = searchParams.get('limit') || '100';
    const sort = searchParams.get('sort') || 'top'; // Sort by top (best) comments

    if (!permalink) {
      return NextResponse.json({ error: 'Permalink is required' }, { status: 400 });
    }

    // Fetch comments sorted by best/top
    const cleanPermalink = permalink.startsWith('/') ? permalink.slice(1) : permalink;
    const commentsURL = `https://oauth.reddit.com/${cleanPermalink}.json?limit=${limit}&sort=${sort}&raw_json=1`;
    
    console.log(`Fetching top comments from: ${commentsURL}`);

    const response = await fetch(commentsURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'RevuAI/0.1 by RevuAI Team'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Reddit Comments API Error: ${response.status}`, errorData);
      return NextResponse.json({ 
        error: `Failed to fetch comments: ${response.statusText}` 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Reddit returns [post_data, comments_data]
    const commentsData = data[1];
    
    return NextResponse.json({ 
      comments: commentsData?.data?.children || [],
      count: commentsData?.data?.children?.length || 0
    });

  } catch (error: any) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch comments' 
    }, { status: 500 });
  }
}