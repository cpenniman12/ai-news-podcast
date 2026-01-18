# Setup New Supabase Project

## Step 1: Create New Project in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization
4. Set project name: `ai-news-podcast` (or your preferred name)
5. Set a strong database password (save it!)
6. Choose region: `us-east-2` (or closest to your users)
7. Select Free plan (or upgrade if needed)
8. Wait for project to provision (2-3 minutes)

## Step 2: Get Project Credentials

After project is created, go to Project Settings → API:

- **Project URL**: `https://[PROJECT-REF].supabase.co`
- **Anon/Public Key**: Copy this
- **Service Role Key**: Copy this (keep secret!)

## Step 3: Create Storage Bucket

1. Go to Storage in the dashboard
2. Click "New bucket"
3. Name: `podcast-audio`
4. Make it **Public** (or configure RLS as needed)
5. Click "Create bucket"

## Step 4: Run Database Migration

Once the project is active, run the migration in `migrations/add_audio_url_to_stories.sql` using:

- Supabase SQL Editor (in dashboard), OR
- Supabase CLI, OR  
- I can run it via MCP once you give me the project ID

## Step 5: Update Environment Variables

Update your `.env.local` with the new project credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

## Step 6: Verify Setup

After migration, the following tables should exist:
- `podcast_episodes` (with `created_at` and `status` columns)
- `stories` (with `audio_url` column)
