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

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - [Anthropic API](https://console.anthropic.com/) (Required - for Claude Agent SDK)
  - [Brave Search API](https://brave.com/search/api/) (Required - free tier available)
  - [OpenAI API](https://platform.openai.com/api-keys) (Required - for TTS)
  - [Supabase](https://supabase.com/) (Optional - for user tracking)

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
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open the application at http://localhost:3000

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Anthropic API - Required for Claude Agent SDK
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Brave Search API - Required for news search
BRAVE_API_KEY=your_brave_search_api_key_here

# OpenAI API - Required for TTS audio generation
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (Optional) - For user tracking
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

1. Browse Headlines: View the 20 best AI/tech news stories curated daily
2. Select Stories: Click on 1-6 headlines you want to hear about (indicated by white dots)
3. Generate Podcast: Click "Generate Podcast" when ready
4. Wait for Research: The app researches each story in detail (2-3 minutes)
5. Listen: Enjoy your personalized podcast episode

## Project Structure

```
src/
  app/
    api/                           # API routes
      headlines/                   # Multi-source news aggregation
      generate-detailed-script/    # Claude-powered story research and script generation
      generate-audio/              # TTS audio generation with chunking
    page.tsx                       # Main application page
  components/                      # React components
    HeadlineSelector.tsx           # Minimal headline selection UI
    PodcastGenerator.tsx           # Generation button and progress
    AudioPlayer.tsx                # Clean audio playback interface
  utils/                           # Utility functions
    claude-agent.ts                # Claude Agent SDK integration
    headlines-client.ts            # Client-side headline fetching
    supabase/                      # Authentication setup
.env.example                       # Environment variables template
README.md                          # This file
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

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

Built for the AI community
