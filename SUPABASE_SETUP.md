# Supabase Database Setup

This guide will help you set up the necessary database tables for the email verification and rate limiting system.

## Required Tables

### 1. user_generations

This table tracks when users generate podcasts for rate limiting purposes.

```sql
-- Create user_generations table
CREATE TABLE public.user_generations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    generation_date DATE NOT NULL,
    episode_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_generations_pkey PRIMARY KEY (id)
);

-- Create index for efficient queries
CREATE INDEX idx_user_generations_email_date ON public.user_generations (email, generation_date);

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_generations ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read their own records
CREATE POLICY "Users can view their own generations" ON public.user_generations
    FOR SELECT USING (auth.email() = email);

-- Policy to allow service role to insert records
CREATE POLICY "Service role can insert generations" ON public.user_generations
    FOR INSERT WITH CHECK (true);
```

### 2. Update podcast_episodes table (if needed)

The existing `podcast_episodes` table should be sufficient, but ensure it has proper permissions:

```sql
-- Ensure podcast_episodes table exists with proper structure
-- (This table should already exist based on the codebase)

-- If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title TEXT,
    script TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT podcast_episodes_pkey PRIMARY KEY (id)
);

-- Set up RLS for podcast_episodes
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert episodes
CREATE POLICY "Service role can manage episodes" ON public.podcast_episodes
    FOR ALL USING (true);
```

## Environment Variables

Make sure you have the following environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## Admin User Setup

The system recognizes `cooperpenniman@gmail.com` as an admin user who can bypass rate limits. No special database setup is needed for this - it's handled in the application code.

## Email Authentication Setup

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable "Email" as a sign-in provider
3. Configure your email templates if desired
4. Set up email verification requirements

## Testing the Setup

1. Try generating a podcast with a regular email address
2. Check that verification emails are sent
3. Verify that rate limiting works (try generating twice in one day)
4. Test admin bypass with `cooperpenniman@gmail.com`

## Troubleshooting

### Common Issues:

1. **"Authentication service error"**: Check that your Supabase credentials are correct
2. **"Database error"**: Ensure the `user_generations` table exists and has proper permissions
3. **Verification emails not sending**: Check your Supabase email settings and SMTP configuration

### Checking Database Setup:

You can verify your tables exist by running this in the Supabase SQL editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_generations', 'podcast_episodes');

-- Check user_generations structure
\d public.user_generations;

-- Check sample data
SELECT email, generation_date, created_at 
FROM public.user_generations 
ORDER BY created_at DESC 
LIMIT 5;
``` 