# 🎙️ AI Podcast Generator

An intelligent AI-powered application that transforms the latest AI and technology news into personalized podcast episodes. Built with Next.js, this app researches headlines in-depth and generates professional-quality audio content.

## ✨ Features

### 🔍 **Intelligent News Research**
- **Multi-source headline aggregation** using Brave Search API
- **Deep research capabilities** that gather 5-8 detailed sources per story
- **AI-focused content filtering** (OpenAI, Anthropic, Meta, Google, Nvidia, etc.)
- **Real-time news processing** from TechCrunch, The Verge, Reuters, Bloomberg

### 🎯 **Smart Content Generation**
- **GPT-4o powered script writing** for professional podcast segments
- **2-3 minute detailed coverage** per story with context and analysis
- **Natural conversation flow** with smooth transitions
- **Funding amounts, technical details, and market impact** included

### 🔊 **High-Quality Audio Production**
- **OpenAI TTS integration** for natural-sounding voice synthesis
- **Professional audio output** ready for immediate listening
- **Multiple story compilation** into cohesive episodes
- **Downloadable MP3 files** for offline listening

### 🔐 **Security & Configuration**
- **Environment-based API key management**
- **Graceful authentication fallback**
- **Demo mode** when Supabase isn't configured
- **Comprehensive error handling**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - [Brave Search API](https://brave.com/search/api/) (Free tier available)
  - [OpenAI API](https://platform.openai.com/api-keys)
  - [Perplexity API](https://docs.perplexity.ai/docs/getting-started)
  - [Supabase](https://supabase.com/) (Optional, for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cpenniman12/ai-news-podcast.git
   cd ai-news-podcast
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ⚙️ Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Brave Search API - Get your free API key at https://brave.com/search/api/
BRAVE_API_KEY=your_brave_search_api_key_here

# OpenAI API - Get your API key at https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Perplexity API - Get your API key at https://docs.perplexity.ai/docs/getting-started
PPLX_API_KEY=your_perplexity_api_key_here

# Supabase (Optional) - Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 📖 How It Works

### 1. **News Research Pipeline**
```
Headlines Selection → Brave Search → Multi-source Research → Content Aggregation
```

### 2. **Script Generation Process**
```
Research Data → GPT-4o Processing → Professional Script → Quality Validation
```

### 3. **Audio Production**
```
Script Content → OpenAI TTS → MP3 Generation → Ready for Download
```

## 🎯 Usage

1. **Select Headlines**: Choose 2-6 interesting AI/tech news stories
2. **Generate Podcast**: Click "Generate My Enhanced Podcast"
3. **Wait for Research**: The app researches each story in detail (~60-90 seconds)
4. **Listen & Download**: Enjoy your personalized podcast episode

## 🏗️ Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── headlines/          # News headline fetching
│   │   │   ├── generate-detailed-script/  # Enhanced script generation
│   │   │   ├── generate-audio/     # TTS audio generation
│   │   └── page.tsx               # Main application page
│   ├── components/                # React components
│   ├── utils/                     # Utility functions
│   │   ├── brave-gpt-news.ts      # News research logic
│   │   ├── perplexity.ts          # Perplexity API integration
│   │   └── supabase/              # Authentication setup
├── .env.example                   # Environment variables template
├── ENVIRONMENT_SETUP.md           # Detailed setup guide
└── ENHANCED_PODCAST_GUIDE.md      # Feature documentation
```

## 🔧 Development

### API Endpoints

- `GET /api/headlines` - Fetch latest AI news headlines
- `POST /api/generate-detailed-script` - Research and generate podcast script
- `POST /api/generate-audio` - Convert script to audio

### Key Technologies

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **AI Services**: OpenAI GPT-4o, OpenAI TTS, Perplexity AI
- **Search**: Brave Search API
- **Authentication**: Supabase (optional)

## 📊 Performance

- **Research Time**: ~60-90 seconds for detailed multi-source research
- **Script Generation**: ~15-30 seconds for professional content
- **Audio Generation**: ~30-45 seconds for high-quality TTS
- **Total Processing**: ~2-3 minutes for complete podcast episode

## 🔒 Security Features

- ✅ Environment-based API key management
- ✅ Input validation and sanitization
- ✅ Rate limiting awareness for external APIs
- ✅ Graceful error handling and user feedback
- ✅ No hardcoded credentials in source code

## 🎛️ Demo Mode

The app includes a demo mode that works without Supabase authentication:
- Automatically enabled when Supabase credentials aren't configured
- Full functionality for podcast generation
- Perfect for testing and development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Brave Search API](https://brave.com/search/api/) for comprehensive news search
- [OpenAI](https://openai.com/) for GPT-4o and TTS capabilities
- [Perplexity AI](https://perplexity.ai/) for intelligent content processing
- [Supabase](https://supabase.com/) for authentication infrastructure

## 📧 Support

For questions, issues, or feature requests, please open an issue on GitHub or contact the maintainer.

---

**Built with ❤️ for the AI community**
