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
   - `BRAVE_API_KEY`: [your-brave-api-key]
   - `OPENAI_API_KEY`: (your OpenAI key)
   - `PPLX_API_KEY`: [your-pplx-api-key]
   - `NEXT_PUBLIC_SUPABASE_URL`: (your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (your Supabase anon key)
   - `SUPABASE_SERVICE_ROLE_KEY`: (your Supabase service key)

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
BRAVE_API_KEY=[your-brave-api-key]
OPENAI_API_KEY=[your-openai-key]
PPLX_API_KEY=[your-pplx-api-key]
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-key]
```

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