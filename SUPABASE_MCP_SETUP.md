# Supabase MCP Setup Guide

This guide will help you set up Supabase with Model Context Protocol (MCP) for the AI News Podcast application.

## Prerequisites

- Cursor IDE installed
- Supabase account (free tier is fine)
- Node.js and npm installed

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization (create one if needed)
4. Set project details:
   - **Name**: `ai-news-podcast` (or your preferred name)
   - **Database Password**: Create a strong password and save it securely
   - **Region**: Choose closest to your location (e.g., `us-east-1`)
   - **Plan**: Free tier is sufficient for development
5. Click "Create new project"
6. Wait 2-3 minutes for project provisioning

## Step 2: Get Supabase Credentials

After your project is created:

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **Anon/Public Key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key**: This is your service role key (keep it secret!)

3. Go to **Project Settings** → **Database**
4. Copy the **Connection String** (you'll need the password you created earlier)

## Step 3: Configure MCP for Supabase

### Option A: Using Cursor Settings (Recommended)

1. In Cursor, open Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add Supabase MCP configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

Replace:
- `[PROJECT-REF]` with your project reference (from Project URL)
- `[PASSWORD]` with your database password

### Option B: Using MCP Settings File

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

## Step 4: Set Up Environment Variables

1. In your project root, create `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# API Keys (Required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
BRAVE_API_KEY=your_brave_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional
CRON_SECRET=your_secure_random_string_here
SUPABASE_DB_PASSWORD=[your-database-password]
```

2. Replace the placeholder values with your actual credentials

## Step 5: Run Database Migrations

### Option A: Using Supabase Dashboard

1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click "New query"
4. Copy the contents of `migrations/01_initial_schema.sql`
5. Paste and click "Run"
6. Repeat for `migrations/add_audio_url_to_stories.sql`

### Option B: Using MCP (Once configured)

With MCP configured, you can ask the AI agent:
```
Run the database migrations in the migrations folder using MCP
```

### Option C: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref [PROJECT-REF]

# Run migrations
supabase db push
```

## Step 6: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click "New bucket"
3. Bucket name: `podcast-audio`
4. Set as **Public** (or configure RLS policies as needed)
5. Click "Create bucket"

### Configure Bucket Policy (Optional)

If you want to make the bucket public:

1. Click on the `podcast-audio` bucket
2. Go to "Policies"
3. Add a policy for public read access:

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-audio');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'podcast-audio' AND auth.role() = 'authenticated');
```

## Step 7: Verify Setup

### Test Database Connection

Create a test file `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test database connection
  const { data, error } = await supabase
    .from('podcast_episodes')
    .select('count');
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Connection successful!');
    console.log('Database is ready.');
  }
}

testConnection();
```

Run it:
```bash
node test-supabase.js
```

### Test MCP Connection

In Cursor, you can test MCP by asking:
```
Can you check if the Supabase database tables exist?
```

The AI should be able to query your database through MCP.

## Step 8: Build and Run the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
open http://localhost:3000
```

## Troubleshooting

### MCP Not Working

1. **Restart Cursor**: Close and reopen Cursor after adding MCP configuration
2. **Check logs**: Look for MCP errors in Cursor's developer console
3. **Verify credentials**: Ensure your connection string is correct
4. **Network issues**: Check if your firewall allows connections to Supabase

### Database Connection Errors

1. **Check password**: Ensure you're using the correct database password
2. **Pooler vs Direct**: Try switching between connection strings:
   - Pooler: `aws-0-[region].pooler.supabase.com:6543`
   - Direct: `db.[project-ref].supabase.co:5432`
3. **SSL mode**: Add `?sslmode=require` to connection string if needed

### Environment Variables Not Loading

1. **Restart dev server**: After changing `.env.local`, restart `npm run dev`
2. **Check file name**: Must be exactly `.env.local`
3. **Check location**: Must be in project root directory
4. **No quotes**: Don't wrap values in quotes unless they contain spaces

## Security Best Practices

1. **Never commit** `.env.local` to git (already in `.gitignore`)
2. **Use service role key** only on server-side
3. **Rotate keys** if accidentally exposed
4. **Enable RLS** (Row Level Security) on tables for production
5. **Limit CORS** origins in Supabase settings

## Next Steps

1. ✅ Supabase project created
2. ✅ MCP configured
3. ✅ Environment variables set
4. ✅ Database migrated
5. ✅ Storage bucket created
6. 🎯 **Ready to generate podcasts!**

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Project README](./README.md)

## Support

If you encounter issues:
1. Check the error messages in browser console and terminal
2. Verify all credentials are correct
3. Ensure migrations ran successfully
4. Check Supabase project status in dashboard

---

**Note**: This setup is for development. For production deployment, follow the additional security and performance guidelines in the Supabase documentation.
