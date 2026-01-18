-- Migration: Add audio_url column to stories table
-- Run this migration to add support for storing audio URLs from Supabase Storage

-- Add audio_url column to stories table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE stories ADD COLUMN audio_url TEXT;
        RAISE NOTICE 'Added audio_url column to stories table';
    ELSE
        RAISE NOTICE 'audio_url column already exists in stories table';
    END IF;
END $$;

-- Ensure podcast_episodes has created_at if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'podcast_episodes' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE podcast_episodes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to podcast_episodes table';
    ELSE
        RAISE NOTICE 'created_at column already exists in podcast_episodes table';
    END IF;
END $$;

-- Ensure podcast_episodes has status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'podcast_episodes' AND column_name = 'status'
    ) THEN
        ALTER TABLE podcast_episodes ADD COLUMN status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added status column to podcast_episodes table';
    ELSE
        RAISE NOTICE 'status column already exists in podcast_episodes table';
    END IF;
END $$;
