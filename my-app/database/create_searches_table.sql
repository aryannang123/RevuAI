-- Create searches table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  search_query TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_created_at ON searches(created_at);
CREATE INDEX idx_searches_status ON searches(status);

-- Enable Row Level Security (RLS)
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own searches
CREATE POLICY "Users can view their own searches" ON searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches" ON searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches" ON searches
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_searches_updated_at 
    BEFORE UPDATE ON searches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();