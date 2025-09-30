-- Migration: Add daily_episodes table for pre-generated podcast content
-- Date: August 2, 2025
-- Purpose: Store daily pre-generated podcast episodes with 2 stories each

-- Create daily_episodes table
CREATE TABLE public.daily_episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    episode_date DATE NOT NULL UNIQUE,
    
    -- Story 1 details
    story_1_title TEXT NOT NULL,
    story_1_script TEXT NOT NULL,
    story_1_audio_url TEXT,
    story_1_duration_seconds INTEGER,
    
    -- Story 2 details  
    story_2_title TEXT NOT NULL,
    story_2_script TEXT NOT NULL,
    story_2_audio_url TEXT,
    story_2_duration_seconds INTEGER,
    
    -- Metadata
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    total_headlines_processed INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT daily_episodes_pkey PRIMARY KEY (id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_daily_episodes_date ON public.daily_episodes (episode_date DESC);
CREATE INDEX idx_daily_episodes_status ON public.daily_episodes (generation_status);

-- Set up Row Level Security (RLS)
ALTER TABLE public.daily_episodes ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to completed episodes
CREATE POLICY "Public can view completed episodes" ON public.daily_episodes
    FOR SELECT USING (generation_status = 'completed');

-- Policy to allow service role to manage all episodes
CREATE POLICY "Service role can manage episodes" ON public.daily_episodes
    FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_episodes_updated_at 
    BEFORE UPDATE ON public.daily_episodes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO public.daily_episodes (
--     episode_date,
--     story_1_title,
--     story_1_script,
--     story_2_title, 
--     story_2_script,
--     generation_status
-- ) VALUES (
--     CURRENT_DATE,
--     'Sample AI Story 1',
--     'This is a sample script for the first AI story...',
--     'Sample AI Story 2',
--     'This is a sample script for the second AI story...',
--     'completed'
-- );