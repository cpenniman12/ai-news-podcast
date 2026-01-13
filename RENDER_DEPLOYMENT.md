# Deploy to Render - Step by Step Guide

## Why Render?
- **Simpler setup** than Vercel - no authentication issues
- **Free tier** with 750 hours/month (enough for testing)
- **Automatic deployments** from GitHub
- **Built-in environment variable management**
- **No rate limiting issues** we experienced with Vercel

## Prerequisites
1. Push your code to GitHub (already done)
2. Have your API keys ready:
   - `ANTHROPIC_API_KEY`: (your Anthropic API key)
   - `BRAVE_API_KEY`: (your Brave Search API key)
   - `OPENAI_API_KEY`: (your OpenAI key)
   - `NEXT_PUBLIC_SUPABASE_URL`: (your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (your Supabase anon key)

## Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account (easiest)
3. This automatically connects your GitHub repositories

## Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `ai-news-podcast`
3. Choose your repository from the list

## Step 3: Configure Service Settings
**Basic Settings:**
- **Name**: `ai-daily-briefing` (or any name you prefer)
- **Runtime**: `Node`
- **Branch**: `main` (or your default branch)
- **Root Directory**: (leave blank)
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`

**Advanced Settings:**
- **Instance Type**: `Free` (for testing)
- **Auto-Deploy**: `Yes` (deploys automatically on GitHub pushes)

## Step 4: Set Environment Variables
In the **Environment** section, add these variables:

```
NODE_ENV=production
ANTHROPIC_API_KEY=[your-anthropic-key]
BRAVE_API_KEY=[your-brave-search-key]
OPENAI_API_KEY=[your-openai-key]
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
CRON_SECRET=[generate-a-random-secret-for-cron-jobs]
```

**Important:** The `CRON_SECRET` is used to secure the daily headline refresh endpoint. Generate a random string (like `your-secure-random-string-123`) to prevent unauthorized access.

## Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm ci`)
   - Build your app (`npm run build`)
   - Start the server (`npm start`)

## Step 6: Monitor Deployment
- Watch the **Logs** tab for build progress
- The build typically takes 2-5 minutes
- Once deployed, you'll get a URL like: `https://ai-daily-briefing.onrender.com`

## Step 7: Test Your App
1. Visit your Render URL
2. Test the headlines API: `https://your-app.onrender.com/api/headlines`
3. Check the health endpoint: `https://your-app.onrender.com/api/health`

## Step 8: Set Up Daily Headlines Refresh (IMPORTANT!)

The app uses a **file-based cache** for headlines that persists across requests but needs daily updates. Set up a cron job to refresh headlines every day at 6am ET.

### Option 1: Use Render Cron Jobs (Recommended if available)
1. In your Render dashboard, create a new **Cron Job**
2. Configure:
   - **Name**: `refresh-headlines-daily`
   - **Command**: `curl -X GET "https://your-app.onrender.com/api/cron/refresh-headlines?secret=YOUR_CRON_SECRET"`
   - **Schedule**: `0 11 * * *` (6am ET = 11am UTC in winter, 10am UTC in summer)
   - Replace `YOUR_CRON_SECRET` with your actual `CRON_SECRET` value

### Option 2: Use External Cron Service (Free)
If Render cron jobs aren't available on your plan, use a free service like cron-job.org:

1. Go to https://cron-job.org (or similar service)
2. Create a free account
3. Create a new cron job:
   - **URL**: `https://your-app.onrender.com/api/cron/refresh-headlines?secret=YOUR_CRON_SECRET`
   - **Schedule**: `0 11 * * *` (daily at 11am UTC)
   - **Method**: GET
4. Enable the job

### Testing the Cron Endpoint
Test manually to ensure it works:
```bash
curl "https://your-app.onrender.com/api/cron/refresh-headlines?secret=YOUR_CRON_SECRET"
```

You should see a response like:
```json
{
  "success": true,
  "message": "Headlines refreshed successfully",
  "count": 20,
  "duration": "45s",
  "timestamp": "2026-01-12T11:00:00.000Z"
}
```

### How the Caching Works
- **First load**: App serves fallback headlines immediately (no loading screen!)
- **After cron job runs**: Fresh AI-curated headlines are cached in `.cache/headlines.json`
- **Subsequent loads**: Instant - headlines served from cache
- **Cache survives**: Server restarts (stored in persistent disk)
- **Daily refresh**: Cron job generates fresh headlines each morning

## Troubleshooting

### Build Fails
- Check the **Logs** tab for specific errors
- Common issues:
  - Missing environment variables
  - Node.js version mismatch
  - Dependency conflicts

### App Loads But No Headlines
- Check environment variables are set correctly
- Test API endpoints individually
- Monitor logs for rate limiting or API errors

### Slow Loading
- Free tier has some limitations
- Consider upgrading to paid tier for better performance
- App "sleeps" after 15 minutes of inactivity (normal for free tier)

## Advantages Over Vercel
✅ **No authentication issues**
✅ **Simpler environment variable setup**
✅ **Clear build logs**
✅ **No rate limiting from platform**
✅ **Free tier is generous**
✅ **Easy GitHub integration**

## Next Steps
- Once deployed successfully, update any documentation with new URL
- Consider custom domain if needed
- Monitor usage and upgrade plan if necessary

## Support
- Render has excellent documentation: https://render.com/docs
- Community Discord for help
- GitHub Issues for app-specific problems 