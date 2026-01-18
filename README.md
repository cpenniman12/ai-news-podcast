# AI News Podcast Generator

An intelligent AI-powered application that transforms the latest AI and technology news into personalized podcast episodes. Built with Next.js, this app aggregates headlines from multiple sources, researches stories in-depth using Claude AI with web search, and generates professional-quality audio content with a clean, minimal interface.

## Features

### Multi-Source News Aggregation
- Brave Search API for comprehensive web search
- Claude AI with custom search tools for intelligent headline curation
- RSS Feed Integration from top AI/tech sources:
  - Andreessen Horowitz (a16z)
  - Midjourney, Google AI, Meta AI
  - TechMeme, TechNode, NVIDIA
  - OpenAI, Waymo, Sequoia Capital
- Smart caching with daily refresh at 6 AM ET
- Claude-powered headline curation for the 20 best stories

### Intelligent Content Generation
- Claude Agent SDK with web search for deep story research
- Professional podcast script writing with context and analysis
- 2-3 minute detailed coverage per story
- Natural conversation flow with smooth transitions between stories
- Funding amounts, technical details, and market impact included

### High-Quality Audio Production
- OpenAI TTS integration for natural-sounding voice synthesis
- Script chunking for handling long-form content
- Professional audio output ready for immediate listening
- Multiple story compilation into cohesive episodes
- Temporary audio hosting with 1-hour availability

### Clean, Minimal Interface
- Ultra-minimal design with no visual clutter
- Click-to-select headlines with subtle dot indicators
- Fixed bottom action bar for podcast generation
- Responsive design optimized for desktop and mobile
- Dark theme with elegant typography

### Security and Configuration
- Environment-based API key management
- Demo mode when authentication is not configured
- Comprehensive error handling and graceful fallbacks
- Supabase integration for optional user tracking

## Quick Start

### 🚀 Fast Setup (10 minutes)

See **[QUICKSTART.md](./QUICKSTART.md)** for a step-by-step guide to get running quickly.

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - [Anthropic API](https://console.anthropic.com/) (Required - for Claude Agent SDK)
  - [Brave Search API](https://brave.com/search/api/) (Required - free tier available)
  - [OpenAI API](https://platform.openai.com/api-keys) (Required - for TTS)
  - [Supabase](https://supabase.com/) (Required - for episode storage)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/cpenniman12/ai-news-podcast.git
   cd ai-news-podcast
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   # .env.local is already created with placeholders
   # Edit it with your actual API keys
   code .env.local
   ```

4. Set up Supabase database
   - Follow **[SUPABASE_MCP_SETUP.md](./SUPABASE_MCP_SETUP.md)** for complete instructions
   - Run migrations in Supabase SQL Editor
   - Create `podcast-audio` storage bucket

5. Start the development server
   ```bash
   npm run dev
   ```

6. Open the application at http://localhost:3000

### 🔧 Additional Setup

- **MCP Configuration**: See [SUPABASE_MCP_SETUP.md](./SUPABASE_MCP_SETUP.md) to enable Cursor AI database access
- **Setup Verification**: Run `./scripts/setup-supabase.sh` to check your configuration

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Anthropic API - Required for Claude Agent SDK
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Brave Search API - Required for news search
BRAVE_API_KEY=your_brave_search_api_key_here

# OpenAI API - Required for TTS audio generation
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (Required) - For episode storage and story management
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## How It Works

### 1. Multi-Source News Pipeline
```
RSS Feeds + Brave Search --> Claude AI Curation --> 20 Best Headlines
```

### 2. Story Research Process
```
Selected Headlines --> Claude with Web Search --> Deep Research --> Context Building
```

### 3. Script Generation
```
Research Data --> Claude Processing --> Professional Script --> Quality Validation
```

### 4. Audio Production
```
Script Content --> OpenAI TTS --> MP3 Generation --> Temporary Hosting
```

## Usage

### Listening to Episodes

The app now features a **Story Switcher** interface that lets you navigate through individual stories in the latest episode:

1. **View Latest Episode**: The home page automatically loads the most recent complete podcast episode
2. **Navigate Stories**: Use the Previous/Next buttons at the bottom to switch between stories
3. **Auto-Advance**: Stories automatically advance to the next one when playback ends
4. **Track Progress**: See which story you're on (e.g., "Story 2 of 5")

### Generating New Episodes (via API)

The daily podcast is automatically generated at 6 AM ET via cron job. You can also trigger generation manually:

```bash
curl -X POST https://your-domain.com/api/cron/generate-daily-podcast \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Project Structure

```
src/
  app/
    api/                                # API routes
      headlines/                        # Multi-source news aggregation
      episodes/latest/                  # Get latest complete episode
      generate-detailed-script/         # Claude-powered story research
      generate-audio/                   # TTS audio generation with chunking
      cron/                             # Automated jobs
        refresh-headlines/              # Daily headline refresh
        generate-daily-podcast/         # Daily episode generation
    page.tsx                            # Main app with StorySwitcher
  components/                           # React components
    StorySwitcher.tsx                   # Story navigation interface
    AudioPlayer.tsx                     # Clean audio playback
    HeadlineSelector.tsx                # Headline selection UI (legacy)
    PodcastGenerator.tsx                # Generation UI (legacy)
  utils/                                # Utility functions
    claude-agent.ts                     # Claude Agent SDK integration
    headlines-client.ts                 # Client-side headline fetching
    audio-storage.ts                    # Supabase storage management
    supabase/                           # Supabase client setup
      client.ts                         # Browser client
      server.ts                         # Server client
      middleware.ts                     # Auth middleware
migrations/                             # Database migrations
  01_initial_schema.sql                 # Initial tables
  add_audio_url_to_stories.sql          # Audio URL support
scripts/                                # Helper scripts
  setup-supabase.sh                     # Setup verification
  refresh-headlines.sh                  # Manual headline refresh
.env.local                              # Environment variables (create from .env.example)
QUICKSTART.md                           # Fast setup guide
SUPABASE_MCP_SETUP.md                   # Detailed Supabase setup
README.md                               # This file
```

## Development

### API Endpoints

- `GET /api/headlines` - Fetch and curate latest AI news headlines using Claude
- `POST /api/generate-detailed-script` - Research stories with Claude web search and generate podcast script
- `POST /api/generate-audio` - Convert script to audio using OpenAI TTS

### Key Technologies

- Frontend: Next.js 15, React, Tailwind CSS
- Backend: Next.js API Routes, Node.js
- AI Services: Claude (Anthropic), OpenAI TTS
- Search: Brave Search API, Claude web search
- RSS: rss-parser for feed aggregation
- Authentication: Supabase (optional)

## Performance

- Headline Caching: Daily refresh at 6 AM ET for optimal performance
- Story Research: 30-60 seconds per story for comprehensive research
- Script Generation: 15-30 seconds for professional content
- Audio Generation: 30-60 seconds for high-quality TTS
- Total Processing: 2-3 minutes for complete podcast episode

## Security Features

- Environment-based API key management
- Input validation and sanitization
- Rate limiting awareness for external APIs
- Graceful error handling and user feedback
- No hardcoded credentials in source code
- Temporary audio hosting (1-hour expiration)

## Demo Mode

The app includes a demo mode that works without Supabase authentication:
- Automatically enabled when Supabase credentials are not configured
- Full functionality for podcast generation
- Perfect for testing and development

## UI/UX Features

- Minimal Design: Clean interface with no visual clutter
- Responsive Layout: Optimized for desktop and mobile
- Dark Theme: Elegant dark interface with subtle accents
- Intuitive Selection: Click headlines to select (no checkboxes)
- Fixed Action Bar: Always-accessible generation button
- Smooth Animations: Subtle hover effects and transitions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Anthropic for Claude AI and the Agent SDK
- Brave Search API for comprehensive news search
- OpenAI for TTS capabilities
- Supabase for authentication infrastructure
- RSS feeds from leading AI/tech organizations

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 10 minutes
- **[SUPABASE_MCP_SETUP.md](./SUPABASE_MCP_SETUP.md)** - Complete Supabase & MCP setup guide
- **[CRON_FIX_GUIDE.md](./CRON_FIX_GUIDE.md)** - Cron job troubleshooting
- **[FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md)** - Planned features

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

Built for the AI community
