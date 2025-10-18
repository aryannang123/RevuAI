import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subreddit = searchParams.get('subreddit');

  if (!subreddit) {
    return NextResponse.json({ error: 'Subreddit parameter is required' }, { status: 400 });
  }

  const redditURL = `https://www.reddit.com/r/${subreddit.trim()}.json`;

  try {
    console.log(`Proxying request to: ${redditURL}`);
    const response = await fetch(redditURL, {
      headers: {
        'User-Agent': 'RevuAI/0.1 by RevuAI Team'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Reddit API Error: ${response.status}`, errorData);
      return NextResponse.json({ error: `Reddit API error (Status: ${response.status})` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to fetch from Reddit API via proxy:', error);
    return NextResponse.json({ error: 'Failed to fetch from Reddit API' }, { status: 500 });
  }
}
