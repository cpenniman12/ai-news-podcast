-- Initial Schema Setup for AI News Podcast
-- Run this migration after creating a new Supabase project

-- Create podcast_episodes table if it doesn't exist
CREATE TABLE IF NOT EXISTS podcast_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    script TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stories table if it doesn't exist
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    script TEXT,
    audio_url TEXT,
    "order" INTEGER NOT NULL,
    sources JSONB,
    quotes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stories_episode_id ON stories(episode_id);
CREATE INDEX IF NOT EXISTS idx_stories_order ON stories(episode_id, "order");
CREATE INDEX IF NOT EXISTS idx_episodes_status ON podcast_episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON podcast_episodes(created_at DESC);
