import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseServiceKey: !!supabaseServiceKey
  });
}

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// GET - Fetch user's searches
export async function GET(request: Request) {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured properly');
      return NextResponse.json({ 
        error: 'Database not configured properly' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Fetching searches for user:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching searches:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch searches', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('Successfully fetched searches:', data?.length || 0);
    return NextResponse.json({ searches: data || [] });
  } catch (error) {
    console.error('Error in GET /api/searches:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new search
export async function POST(request: Request) {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured properly');
      return NextResponse.json({ 
        error: 'Database not configured properly' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { userId, userEmail, searchQuery } = body;

    console.log('Creating search for user:', userId, 'query:', searchQuery);

    if (!userId || !searchQuery) {
      return NextResponse.json({ 
        error: 'User ID and search query are required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('searches')
      .insert({
        user_id: userId,
        user_email: userEmail,
        search_query: searchQuery,
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating search:', error);
      return NextResponse.json({ 
        error: 'Failed to create search',
        details: error.message 
      }, { status: 500 });
    }

    console.log('Successfully created search:', data.id);
    return NextResponse.json({ search: data });
  } catch (error) {
    console.error('Error in POST /api/searches:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}