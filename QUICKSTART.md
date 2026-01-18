# Quick Start Guide

Get the AI News Podcast app running in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- API keys ready (or use placeholders for initial setup)

## 1. Clone and Install (2 minutes)

```bash
git clone https://github.com/cpenniman12/ai-news-podcast.git
cd ai-news-podcast
npm install
```

## 2. Configure Environment Variables (3 minutes)

The `.env.local` file is already created with placeholder values. Edit it with your API keys:

```bash
# Open .env.local in your editor
code .env.local  # or use nano, vim, etc.
```

### Required API Keys

Get these API keys (all have free tiers):

1. **Anthropic API** (for Claude AI)
   - Sign up: https://console.anthropic.com/
   - Navigate to API Keys
   - Create a new key
   - Paste into `ANTHROPIC_API_KEY`

2. **Brave Search API** (for news search)
   - Sign up: https://brave.com/search/api/
   - Free tier: 2,000 queries/month
   - Paste into `BRAVE_API_KEY`

3. **OpenAI API** (for text-to-speech)
   - Sign up: https://platform.openai.com/
   - Navigate to API Keys
   - Create a new key
   - Paste into `OPENAI_API_KEY`

4. **Supabase** (for database)
   - Sign up: https://supabase.com/
   - Create a new project (takes 2-3 minutes)
   - Get Project URL and Anon Key from Settings → API
   - Paste into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional Keys

- `PPLX_API_KEY`: Perplexity API (fallback for headlines)
- `CRON_SECRET`: Random string for cron job security

## 3. Set Up Supabase Database (3 minutes)

Follow the detailed guide in `SUPABASE_MCP_SETUP.md` or do it quickly:

### Quick Method: Supabase Dashboard

1. Go to your Supabase project
2. Click **SQL Editor** in sidebar
3. Run these migrations in order:
   
   a. Copy contents of `migrations/01_initial_schema.sql` → Paste → Run
   
   b. Copy contents of `migrations/add_audio_url_to_stories.sql` → Paste → Run

4. Click **Storage** in sidebar
5. Create new bucket: `podcast-audio` (make it public)

### Create Storage Bucket

1. In Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `podcast-audio`
4. Public: Yes
5. Click "Create"

## 4. Run the App (30 seconds)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 5. Set Up MCP (Optional, 2 minutes)

MCP (Model Context Protocol) allows Cursor AI to directly interact with your Supabase database.

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP"
3. Add this configuration (or copy from `mcp-config-example.json`):

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
- `[PROJECT-REF]`: From your Supabase project URL
- `[PASSWORD]`: Your database password
- Region may differ (check connection string in Supabase Settings → Database)

4. Restart Cursor

## Verify Your Setup

Run the setup verification script:

```bash
./scripts/setup-supabase.sh
```

This checks:
- ✅ API keys configured
- ✅ Dependencies installed
- ✅ Node.js version

## First Time Usage

1. **Wait for Headlines**: The app fetches headlines on first load (may take 30-60 seconds)
2. **Generate First Episode**: Click on 3-5 headlines → "Generate Podcast"
3. **Be Patient**: First generation takes 2-3 minutes as it researches each story

## Common Issues

### "No podcast available yet"

- The app needs at least one complete episode in the database
- Run the daily podcast generation: `POST /api/cron/generate-daily-podcast`
- Or generate manually through the UI

### Environment variables not loading

- Restart dev server after editing `.env.local`
- Check file is named exactly `.env.local` (not `.env` or `.env.local.txt`)

### Supabase connection errors

- Verify credentials in Supabase dashboard
- Ensure migrations ran successfully
- Check database password is correct

### Build errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## Project Structure Quick Reference

```
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── episodes/     # Episode endpoints
│   │   │   ├── headlines/    # News aggregation
│   │   │   └── generate-*/   # Content generation
│   │   └── page.tsx          # Main app page
│   ├── components/           # React components
│   │   ├── StorySwitcher.tsx # Story navigation
│   │   └── AudioPlayer.tsx   # Audio playback
│   └── utils/                # Utility functions
├── migrations/               # Database migrations
├── .env.local               # Your API keys (DO NOT COMMIT)
└── SUPABASE_MCP_SETUP.md    # Detailed Supabase guide
```

## Next Steps

1. ✅ **App is running** → Start generating podcasts!
2. 📖 **Read the full README** → `README.md`
3. 🔧 **Set up MCP** → `SUPABASE_MCP_SETUP.md`
4. 🚀 **Deploy to production** → See deployment guides

## Need Help?

- **Setup Issues**: Check `SUPABASE_MCP_SETUP.md`
- **API Errors**: Verify API keys in `.env.local`
- **Database Issues**: Re-run migrations
- **General Questions**: Open an issue on GitHub

---

**Time to first podcast**: ~10 minutes setup + 3 minutes generation = 🎉 13 minutes total!
