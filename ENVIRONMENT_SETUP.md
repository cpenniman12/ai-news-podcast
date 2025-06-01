# Environment Variables Setup Guide

## Overview
All API keys and sensitive configuration have been moved to environment variables for security and flexibility.

## Required Environment Variables

### 1. API Keys (Required)
```bash
# Brave Search API - Get your free API key at https://brave.com/search/api/
BRAVE_API_KEY=your_brave_search_api_key_here

# OpenAI API - Get your API key at https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Perplexity API - Get your API key at https://docs.perplexity.ai/docs/getting-started
PPLX_API_KEY=your_perplexity_api_key_here
```

### 2. Supabase Configuration (Required for Authentication)
```bash
# Supabase - Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. API URLs (Optional - defaults provided)
```bash
# These have sensible defaults, only change if needed
BRAVE_WEB_API_URL=https://api.search.brave.com/res/v1/web/search
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_TTS_URL=https://api.openai.com/v1/audio/speech
PPLX_API_URL=https://api.perplexity.ai/chat/completions
```

## Setup Instructions

### 1. Copy the Example File
```bash
cp .env.example .env.local
```

### 2. Fill in Your API Keys
Edit `.env.local` and replace the placeholder values with your actual API keys.

### 3. Get Your API Keys

#### Brave Search API (Free Tier Available)
1. Visit https://brave.com/search/api/
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 2,000 queries per month

#### OpenAI API
1. Visit https://platform.openai.com/api-keys
2. Create an account and add billing information
3. Generate a new API key
4. Note: This requires a paid account with credits

#### Perplexity API
1. Visit https://docs.perplexity.ai/docs/getting-started
2. Sign up for an account
3. Get your API key from the dashboard
4. Free tier available with limited usage

#### Supabase (For Authentication)
1. Visit https://supabase.com/
2. Create a new project
3. Go to Settings > API
4. Copy your Project URL and anon/public key

### 4. Restart the Development Server
```bash
npm run dev
```

## Security Notes

- ✅ `.env.local` is already in `.gitignore` and won't be committed
- ✅ All hardcoded API keys have been removed from source code
- ✅ Environment variables are validated at startup
- ⚠️ Never commit API keys to version control
- ⚠️ Use different API keys for development and production

## Files Updated

The following files were updated to use environment variables:

### API Routes
- `src/app/api/generate-detailed-script/route.ts`
- `src/app/api/headlines/route.ts`
- `src/app/api/generate-audio/route.ts`
- `src/app/api/generate-script/route.ts`

### Utility Files
- `src/utils/perplexity.ts`
- `src/utils/brave-gpt-simple.ts`
- `src/utils/brave-gpt-news.ts`

## Troubleshooting

### Error: "API_KEY environment variable is required"
- Make sure you've created `.env.local` file
- Verify all required API keys are set
- Restart the development server after making changes

### Error: "Supabase client creation failed"
- Add your Supabase URL and anon key to `.env.local`
- Make sure the variables start with `NEXT_PUBLIC_`

### API Rate Limiting
- Brave Search: Free tier has 1 request per second limit
- OpenAI: Depends on your account tier
- Perplexity: Check your plan limits

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add all environment variables to your hosting platform
2. Use production API keys (not development keys)
3. Consider using different Supabase projects for dev/prod
4. Monitor API usage and costs

## Cost Estimates

- **Brave Search**: Free tier (2,000 queries/month)
- **OpenAI**: ~$0.01-0.03 per podcast generation
- **Perplexity**: Free tier available, paid plans start at $20/month
- **Supabase**: Free tier for small projects 