# Complete Supabase Setup Guide

This guide walks you through setting up Supabase for the AI News Podcast application, including Model Context Protocol (MCP) integration for seamless database access.

## Overview

The application uses Supabase for:
- **Database**: PostgreSQL database for storing episodes and stories
- **Storage**: S3-compatible storage for hosting audio files
- **Authentication**: (Optional) User authentication and session management

---

## Part 1: Create Supabase Project

### Step 1: Sign Up / Log In

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in or create a free account

### Step 2: Create a New Project

1. Click **"New Project"** button
2. Fill in project details:
   - **Organization**: Select or create an organization
   - **Name**: `ai-news-podcast` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users (e.g., `us-east-1`, `us-west-2`)
   - **Pricing Plan**: Free plan is sufficient to start
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to provision

### Step 3: Get Project Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** section
3. Copy these values to your `.env.local` file:

   ```bash
   # Project URL
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   
   # anon/public key (safe for frontend)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   
   # service_role key (keep secret!)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

4. Note your **Database Password** from Step 2:
   ```bash
   SUPABASE_DB_PASSWORD=your_database_password
   ```

---

## Part 2: Run Database Migrations

You have three options to run the migrations:

### Option A: Using Supabase Dashboard (Easiest)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New Query"**
3. Copy and paste the contents of `migrations/01_initial_schema.sql`
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. Repeat for `migrations/add_audio_url_to_stories.sql`
6. Verify tables were created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   You should see: `podcast_episodes` and `stories`

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find project ref in Project Settings → General)

3. Run migrations:
   ```bash
   supabase db push
   ```

### Option C: Using MCP (Model Context Protocol)

MCP allows Cursor to directly access and manage your Supabase database. See **Part 4** below for full setup.

---

## Part 3: Create Storage Bucket

### Step 1: Create Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Fill in bucket details:
   - **Name**: `podcast-audio`
   - **Public bucket**: ✅ Check this (so audio URLs are publicly accessible)
4. Click **"Create bucket"**

### Step 2: Configure Storage Policies (Optional)

For a public bucket, default policies are usually sufficient. If you want to add custom policies:

1. Click on the `podcast-audio` bucket
2. Go to **Policies** tab
3. Add policy:
   ```sql
   -- Allow public reads
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'podcast-audio');
   
   -- Allow authenticated inserts (for your app)
   CREATE POLICY "Authenticated Insert"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'podcast-audio');
   ```

---

## Part 4: MCP Setup for Supabase

MCP (Model Context Protocol) enables Cursor to directly interact with your Supabase database, making it easy to run queries, inspect schemas, and manage data.

### What is MCP?

MCP is a protocol that allows AI assistants to connect to external services and tools. The Supabase MCP server enables:
- Running SQL queries directly from Cursor
- Inspecting database schemas
- Managing tables and data
- Running migrations seamlessly

### Prerequisites

- Node.js 18+ installed
- Supabase project created (Parts 1-3 above)
- Project credentials from `.env.local`

### Installation

1. **Install the Supabase MCP Server**:
   
   The Supabase MCP server can be installed globally or locally in your project:
   
   ```bash
   # Option 1: Global installation (recommended)
   npm install -g @modelcontextprotocol/server-supabase
   
   # Option 2: Local to project
   npm install --save-dev @modelcontextprotocol/server-supabase
   ```

2. **Configure Cursor MCP Settings**:

   Create or update the MCP configuration file. This file is typically located at:
   - **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
   - **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`
   - **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`

   Add the Supabase server configuration:

   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": [
           "@modelcontextprotocol/server-supabase",
           "--project-url",
           "https://xxxxxxxxxxxxx.supabase.co",
           "--service-key",
           "your-service-role-key-here"
         ],
         "env": {}
       }
     }
   }
   ```

   **Important**: Replace:
   - `https://xxxxxxxxxxxxx.supabase.co` with your actual project URL
   - `your-service-role-key-here` with your service role key from `.env.local`

3. **Restart Cursor**:
   
   Close and reopen Cursor for the MCP configuration to take effect.

### Using MCP with Supabase

Once configured, you can use MCP resources in Cursor:

1. **Check MCP Connection**:
   ```typescript
   // In Cursor, you can now query your database
   // The AI assistant can run SQL queries directly
   ```

2. **Run Migrations via MCP**:
   ```sql
   -- The assistant can execute SQL from your migration files
   -- Just ask: "Run the migrations in the migrations folder"
   ```

3. **Query Data**:
   ```sql
   -- Ask: "Show me the latest podcast episodes"
   SELECT * FROM podcast_episodes ORDER BY created_at DESC LIMIT 5;
   ```

4. **Inspect Schema**:
   ```sql
   -- Ask: "What columns does the stories table have?"
   ```

### Troubleshooting MCP

If MCP isn't working:

1. **Check MCP Server Installation**:
   ```bash
   npx @modelcontextprotocol/server-supabase --version
   ```

2. **Verify Credentials**:
   - Ensure your service role key is correct
   - Test the connection manually:
     ```bash
     npx @modelcontextprotocol/server-supabase \
       --project-url "https://xxxxx.supabase.co" \
       --service-key "your-key" \
       --test-connection
     ```

3. **Check Cursor Logs**:
   - Open Cursor Developer Tools (Help → Toggle Developer Tools)
   - Look for MCP-related errors in the console

4. **Restart Cursor**:
   - Sometimes a simple restart is all you need

### Alternative: Direct Database Connection String

If the MCP server doesn't work, you can also use a direct Postgres connection:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
      ]
    }
  }
}
```

Get your connection string from:
- Supabase Dashboard → Project Settings → Database → Connection String → URI

---

## Part 5: Verify Setup

### Test Database Connection

Run this SQL query in the Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check columns on stories table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stories';
```

Expected output:
- Tables: `podcast_episodes`, `stories`
- Stories columns: `id`, `episode_id`, `headline`, `script`, `audio_url`, `order`, `sources`, `quotes`, `created_at`

### Test Storage Bucket

1. Go to Storage → `podcast-audio`
2. Try uploading a test file
3. Verify you can access it via public URL

### Test Application Integration

1. Ensure `.env.local` has all Supabase credentials
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Check console for any Supabase connection errors

---

## Part 6: Security Best Practices

### Environment Variables

- ✅ **DO**: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in frontend
- ❌ **DON'T**: Use service role key in frontend code
- ✅ **DO**: Keep `.env.local` in `.gitignore`
- ✅ **DO**: Use different projects for dev/staging/production

### Row Level Security (RLS)

For production, consider enabling RLS:

```sql
-- Enable RLS on tables
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Example: Allow public reads
CREATE POLICY "Enable read for all users" ON podcast_episodes
FOR SELECT USING (true);

CREATE POLICY "Enable read for all users" ON stories
FOR SELECT USING (true);
```

### API Keys

- Rotate keys periodically
- Use separate projects for development and production
- Monitor API usage in Supabase dashboard

---

## Troubleshooting

### "Invalid API key" Error

- Verify you copied the correct keys from Project Settings → API
- Check for extra spaces or newlines in `.env.local`
- Ensure you're using `NEXT_PUBLIC_` prefix for client-side keys

### "Relation does not exist" Error

- Run migrations again (see Part 2)
- Verify tables exist in SQL Editor:
  ```sql
  SELECT * FROM pg_tables WHERE schemaname = 'public';
  ```

### Audio Upload Fails

- Check bucket name is exactly `podcast-audio`
- Verify bucket is public
- Check service role key is correct in `.env.local`

### MCP Not Working

- Verify MCP configuration file location
- Check credentials are correct
- Restart Cursor
- Check Cursor Developer Tools console for errors

---

## Next Steps

After completing this setup:

1. ✅ Verify all credentials are in `.env.local`
2. ✅ Run database migrations
3. ✅ Create storage bucket
4. ✅ Configure MCP (optional but recommended)
5. ✅ Test the application locally
6. 🚀 Deploy to production (Vercel/Render)

For production deployment, see:
- `render.yaml` - Render deployment config
- `vercel.json` - Vercel deployment config
- `CRON_FIX_GUIDE.md` - Setting up daily podcast generation

---

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Review Next.js console output
3. Verify all environment variables are set
4. Check Supabase status page: https://status.supabase.com/

For more help:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com/
- Project README: `README.md`
