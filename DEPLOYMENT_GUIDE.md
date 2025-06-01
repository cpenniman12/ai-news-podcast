# 🚀 Deployment Guide: AI Podcast Generator

## Why Vercel Instead of GitHub Pages?

**GitHub Pages** only supports static sites, but your AI Podcast Generator is a **Next.js application** with:
- Server-side API routes (`/api/headlines`, `/api/generate-script`, etc.)
- Environment variables for API keys
- Dynamic functionality requiring Node.js

**Vercel** is the perfect choice because:
- ✅ Created by the Next.js team
- ✅ Native Next.js support
- ✅ Secure environment variable handling
- ✅ Global CDN and automatic HTTPS
- ✅ Free tier with generous limits
- ✅ Automatic deployments on git push

## 🌐 Step-by-Step Deployment to Vercel

### 1. Create Vercel Account
1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub repositories

### 2. Import Your Repository
1. Click **"Add New..."** → **"Project"**
2. Find **"ai-news-podcast"** repository
3. Click **"Import"**

### 3. Configure Project Settings
Vercel should auto-detect these settings:
- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Output Directory**: `.next` (auto-detected)

### 4. 🔑 Add Environment Variables
Click **"Environment Variables"** and add these **required** variables:

```bash
# Required for headline fetching and research
BRAVE_API_KEY=your_brave_search_api_key_here

# Required for script generation and audio synthesis  
OPENAI_API_KEY=your_openai_api_key_here

# Required for enhanced script generation
PPLX_API_KEY=your_perplexity_api_key_here

# Optional - for authentication (enables user login)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important**: Without the first 3 API keys, the app won't function. The Supabase variables are optional - the app has a demo mode.

### 5. 🚀 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Your app will be live at: `https://ai-news-podcast.vercel.app` (or similar)

## 🔄 Automatic Deployments

Once deployed, Vercel automatically:
- **Deploys on every push** to your main branch
- **Builds and tests** your code
- **Updates the live site** within minutes
- **Provides deployment status** via GitHub

## 🌍 Sharing Your App

After deployment, you can share your AI Podcast Generator with:
- **Direct URL**: `https://your-app-name.vercel.app`
- **Custom domain**: Configure in Vercel dashboard (optional)
- **Social sharing**: The app works on all devices

## 📊 Monitoring and Analytics

Vercel provides:
- **Real-time analytics** on usage
- **Performance metrics** and Core Web Vitals
- **Function logs** for debugging API routes
- **Build logs** for troubleshooting

## 🔧 Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify API keys are valid and have sufficient quotas
- Review build logs in Vercel dashboard

### App Loads but Doesn't Work
- Ensure environment variables are properly set in Vercel
- Check function logs for API errors
- Verify API rate limits aren't exceeded

### Demo Mode Shows Instead of Full App
- Add Supabase environment variables if you want authentication
- Or use demo mode (works perfectly for showcasing the app)

## 💡 Pro Tips

1. **Use Vercel CLI** for local development:
   ```bash
   npx vercel dev
   ```

2. **Preview deployments**: Every PR gets its own preview URL

3. **Environment variables**: Use Vercel's environment variable encryption

4. **Custom domains**: Add your own domain in Vercel dashboard

5. **Analytics**: Enable Vercel Analytics for detailed insights

## 🎯 Next Steps After Deployment

1. **Test all features** on the live site
2. **Share with friends** and get feedback  
3. **Monitor usage** via Vercel dashboard
4. **Add custom domain** (optional)
5. **Enable analytics** for insights

---

**Your AI Podcast Generator is now live and ready to create amazing podcasts from AI news! 🎉** 