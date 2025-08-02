# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI News Podcast Generator - a Next.js application that transforms AI and technology news into personalized podcast episodes. The app aggregates headlines from multiple sources, researches stories in-depth, and generates professional-quality audio content using OpenAI's TTS.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with Turbopack (default port: 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing & Debugging
- No test framework configured - manual testing through browser interface
- Monitor API logs via Next.js dev server console output
- Use `?refresh=true` query parameter on `/api/headlines` to force cache refresh

## High-Level Architecture

### News Aggregation Pipeline
```
RSS Feeds + Brave Search + Perplexity API → GPT-4o Curation → 20 Best Headlines
```

The system fetches news from multiple sources:
- **RSS Feeds**: a16z, Midjourney, Google AI, Meta AI, TechMeme, NVIDIA, OpenAI, etc.
- **Brave Search API**: 5 targeted search queries for different AI categories
- **Perplexity AI**: 8 specialized searches for AI developments
- **GPT-4o Curation**: Selects and ranks the 20 most relevant headlines

### Story Research & Script Generation
1. **Research Phase**: Selected headlines are researched using Brave Search (8 results per story)
2. **Script Generation**: GPT-4o creates 300-450 word conversational podcast segments with quotes
3. **Audio Generation**: OpenAI TTS (tts-1-hd model) converts each script to MP3
4. **Concatenation**: Multiple audio files are combined using ffmpeg or binary concatenation

### Core API Endpoints

#### `/api/headlines` (GET)
- Cached daily refresh at 6 AM ET
- Combines RSS, Brave Search, and Perplexity data
- Returns curated list of 20 headlines via GPT-4o
- Supports `?refresh=true` for manual cache invalidation

#### `/api/generate-detailed-script` (POST)
- Accepts `{ headlines: string[] }`
- Researches each headline via Brave Search
- Generates individual scripts for each story
- Returns `{ script: string, scripts: string[], stats: object }`
- Stores data in Supabase (podcast_episodes and stories tables)

#### `/api/generate-audio` (POST)
- Accepts `{ scripts: string[] }` or `{ script: string }`
- Generates TTS for each script individually
- Concatenates multiple audio files
- Returns MP3 binary data
- Uses temporary files in `/tmp/` with cleanup

### Frontend Architecture

#### Component Structure
- **HeadlineSelector**: Click-to-select interface for headlines (1-6 selection limit)
- **PodcastGenerator**: Generation button and progress tracking
- **PodcastVerificationFlow**: Handles authentication state and generation flow
- **AudioPlayer**: Playback interface with controls

#### State Management
- React useState for local component state
- Supabase client for authentication
- No global state management (Redux/Zustand)

#### Key UI Patterns
- Minimal dark theme design
- Fixed bottom action bar
- Responsive mobile-first layout
- Blob URL management for audio files

## Environment Variables

Required API keys for full functionality:
```bash
BRAVE_API_KEY=your_brave_search_api_key
OPENAI_API_KEY=your_openai_api_key
PPLX_API_KEY=your_perplexity_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app includes demo mode when Supabase credentials aren't configured.

## Technology Stack

### Core Framework
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling

### External APIs
- **OpenAI GPT-4o**: Script generation and headline curation
- **OpenAI TTS**: High-quality audio synthesis (tts-1-hd model)
- **Brave Search API**: Web search for research and headline gathering
- **Perplexity AI**: Intelligent content processing and search
- **Supabase**: Authentication and data storage

### Development Tools
- **ESLint**: Code linting (builds ignore lint errors via next.config.ts)
- **TypeScript**: Type safety with strict mode
- **Turbopack**: Fast development builds

## Data Flow

1. **Headlines**: Fetched daily at 6 AM ET, cached in memory
2. **Selection**: User selects 1-6 headlines via click interface
3. **Research**: Each headline researched via Brave Search API
4. **Script Generation**: GPT-4o creates conversational podcast segments
5. **TTS**: OpenAI converts each script to individual MP3 files
6. **Concatenation**: Audio files combined into single podcast episode
7. **Playback**: User listens via built-in audio player

## iOS App Integration

The project includes a native iOS app (`SimpleTestApp/`) built with SwiftUI:
- Webview wrapper for the Next.js web app
- Native iOS packaging with custom app icons
- Xcode project configuration for App Store deployment

## Important Implementation Notes

### Audio Generation Debugging
- Look for `[TTS DEBUG]` logs in console to trace audio generation issues
- The `/api/generate-audio` endpoint should process multiple scripts individually
- Check temporary file creation/cleanup in `/tmp/` directory
- ffmpeg is used for concatenation when available, with binary fallback

### Caching Strategy
- Headlines cached daily with 6 AM ET refresh cycle
- Timezone handling for EDT/EST transitions
- Force refresh available via `?refresh=true` parameter
- **Development Note**: Homepage shows cached headlines. To test fresh curation changes:
  1. Hit `/api/headlines?refresh=true` first to generate new cache
  2. Then visit homepage at `/` to see updated headlines
  3. Or modify `fetchTechNewsHeadlines()` to always append `?refresh=true` during development

### Rate Limiting
- 1-2 second delays between API requests to external services
- Exponential backoff for failed requests
- Request timeouts configured (15-30 seconds depending on service)

### Authentication
- Optional Supabase integration for user tracking
- Demo mode available without authentication
- Middleware handles session management

### Story Curation System (Enhanced in speed_pod branch)

**Recent Improvements (August 2025)**:
- **Headline Cleaning**: Automatically strips source attributions (`| TechCrunch`, `| Tom's Hardware`)
- **Enhanced Filtering**: Excludes climate/sustainability, EU regulatory, excessive Chinese content, AI security/cybersecurity startups
- **Targeted Search Queries**: More specific Boolean queries instead of broad terms
- **Source Quality**: Removed broad feeds (TechMeme, TechNode), focused on direct company sources
- **GPT-4o Curation**: Stricter prompt with explicit exclusions and duplicate handling
- **Geographic Focus**: Prioritizes US companies, limits international content to major developments

**Curation Flow**: RSS Feeds + Brave Search + Perplexity → GPT-4o Filtering → 20 Best Headlines

### Pre-Generated Audio System (speed_pod branch)

**Architecture Overview**:
- **Daily Generation**: 6 AM ET cron job automatically creates 2 pre-generated stories
- **Story Selection**: Additional GPT-4o curation selects 2 best complementary stories from daily headlines
- **Content Pipeline**: Story research → Script generation → TTS audio → Supabase storage
- **User Experience**: No story selection needed - instant access to 2 ready-to-play stories

**Database Schema**:
- `daily_episodes` table stores 2 stories per day with titles, scripts, audio URLs, and metadata
- Supabase storage bucket `daily-podcast-audio` for MP3 files
- Status tracking: pending → generating → completed → failed

**Key API Endpoints**:
- `/api/generate-daily-podcast` - Main generation endpoint (5min timeout)
- `/api/daily-episode` - Fetches today's episode or latest available
- `/api/cron/daily-generation` - Vercel cron trigger at 6 AM ET

**Frontend Flow**:
1. User lands on homepage
2. Fetches today's episode via `/api/daily-episode`
3. `DailyStories` component shows 2 stories with individual audio players
4. Users can toggle between Story 1 and Story 2
5. Full scripts displayed with audio playback controls

**Development Tools**:
- Manual generation button in dev mode for testing
- Fallback to latest available episode if today's not ready
- Debug logging throughout the pipeline

**Setup Requirements**:
1. Run `supabase_daily_episodes_migration.sql` in Supabase
2. Add `SUPABASE_SERVICE_ROLE_KEY` environment variable
3. Add `CRON_SECRET` for Vercel cron security
4. Configure Supabase storage bucket permissions

When debugging audio generation issues, focus on the script array processing in `/api/generate-audio` and ensure all scripts are being converted to individual TTS files before concatenation.