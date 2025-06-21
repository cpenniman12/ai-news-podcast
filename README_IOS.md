# 📱 AI News Podcast - iOS Development

## 🎯 **Mission**
Convert this Next.js web app into a native iOS app that users can install on their iPhones.

## 📋 **What's In This Repository**
This is a **complete clone** of the working web application with additional iOS development resources:

## 🚨 **IMPORTANT: Repository Boundaries**
- **Original Web App**: https://github.com/cpenniman12/ai-news-podcast ⚠️ **READ ONLY - DO NOT MODIFY**
- **iOS Development**: THIS repository only - work here exclusively

### **Web App (Reference)**
- **Live Demo**: https://ai-news-podcast.vercel.app
- **Full Source Code**: All components, APIs, and logic
- **Working Features**: News aggregation, podcast generation, audio playback

### **iOS Prototype (Proof of Concept)**
- **SimpleTestApp/**: Working iOS app that demonstrates the concept
- **Xcode Project**: Compatible with older Xcode versions
- **Tested & Working**: Runs on iPhone Simulator

## 🚀 **Quick Start for Claude Code**

### **1. Understand the Web App**
```bash
# Key files to study:
src/app/page.tsx                 # Main layout
src/components/HeadlineSelector.tsx  # Core UI component
src/components/PodcastGenerator.tsx  # Generation logic
src/app/api/headlines/route.ts   # News aggregation API
src/app/api/generate-audio/route.ts  # Podcast creation API
```

### **2. Test the iOS Prototype**
```bash
# Open in Xcode and run:
open SimpleTestApp.xcodeproj
# Select iPhone Simulator → Press Play
# Verify: Headlines load, selection works, button enables
```

### **3. Choose Your Approach**
**Option A: React Native (Recommended)**
- Reuse 70-80% of existing React/TypeScript code
- Convert components to React Native equivalents
- Keep existing API endpoints

**Option B: Pure Swift/SwiftUI**
- Complete rewrite in native iOS
- Reference existing logic and UI patterns
- Build new API client

## 🎨 **UI/UX Requirements**

### **Design System**
- **Background**: Pure black (#000)
- **Text**: White with opacity variations (0.9, 0.6, 0.5, 0.4)
- **Selection Indicator**: 4px white circles
- **Button**: White rounded (25px), gray when disabled
- **Typography**: System fonts, clean hierarchy

### **Layout Structure**
```
┌─────────────────────────────────┐
│ Header (Fixed)                  │
│ "The latest AI news, by AI"     │
│ "curate, generate, listen"      │
├─────────────────────────────────┤
│ Main Content (Scrollable)       │
│ "TODAY'S HEADLINES" (5 stories) │
│ □ Headline 1                    │
│ ● Headline 2 (selected)         │
│ □ Headline 3                    │
│ □ Headline 4                    │
│ □ Headline 5                    │
├─────────────────────────────────┤
│ Bottom Action Bar (Fixed)       │
│     [Generate Podcast]          │
└─────────────────────────────────┘
```

## 🔧 **Technical Specifications**

### **API Integration**
The web app has 3 main endpoints to integrate with:
```
GET /api/headlines
- Returns 20 curated AI news headlines
- Aggregates from Brave Search + Perplexity + RSS feeds
- Cached daily, refreshes at 6 AM ET

POST /api/generate-detailed-script
- Takes selected headline indices
- Researches stories in detail
- Generates conversational podcast script

POST /api/generate-audio
- Takes generated scripts
- Creates TTS audio using OpenAI
- Returns concatenated MP3 file
```

### **iOS Compatibility Notes**
Based on testing with SimpleTestApp:
```swift
// Use these settings for broader compatibility:
objectVersion = 50  // Not 56
IPHONEOS_DEPLOYMENT_TARGET = 14.0
compatibilityVersion = "Xcode 9.3"

// SwiftUI syntax that works:
Color.white.opacity(0.6)  // Not .white.opacity(0.6)
VStack                    // Not LazyVStack
.edgesIgnoringSafeArea(.all)  // Not .ignoresSafeArea()
```

## 📱 **Mobile-Specific Features to Add**

### **Audio Playback**
- Native iOS audio player with controls
- Background playback capability
- Lock screen integration
- AirPods/Bluetooth support

### **User Experience**
- Pull-to-refresh for new headlines
- Offline caching of generated podcasts
- Share functionality for podcast files
- Push notifications for daily headlines

### **iOS Integration**
- Siri shortcuts for quick podcast generation
- CarPlay support for audio playback
- Share sheet integration
- App icon and launch screen

## 🎯 **Success Criteria**

### **Phase 1: Basic Functionality**
- ✅ App launches on iPhone
- ✅ Headlines load from API
- ✅ Selection mechanism works (white dots)
- ✅ Generate button enables/disables correctly

### **Phase 2: Core Features**
- ✅ Podcast generation completes successfully
- ✅ Audio plays with native iOS controls
- ✅ UI matches web app design
- ✅ Error handling for API failures

### **Phase 3: Polish**
- ✅ Background audio playback
- ✅ Offline functionality
- ✅ App Store ready (icons, metadata)
- ✅ Performance optimization

## 🚨 **Known Issues to Handle**
- **Perplexity API**: Currently timing out (15s), implement fallback
- **Date Parsing**: RSS feeds have inconsistent formats
- **Audio Concatenation**: Simple fallback when ffmpeg unavailable

## 📦 **Environment Variables Needed**
```env
BRAVE_SEARCH_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

## 🔄 **Development Workflow**

### **Recommended Steps**
1. **Study the web app** - understand the user flow
2. **Test SimpleTestApp** - verify iOS development setup
3. **Choose React Native or Swift** - based on your preference
4. **Start with UI** - get the basic layout working
5. **Add API integration** - connect to existing endpoints
6. **Implement audio** - native iOS audio playback
7. **Polish & test** - prepare for App Store

### **Testing Strategy**
- Use iPhone Simulator for rapid iteration
- Test on physical device for audio/performance
- Verify all user flows work end-to-end
- Test edge cases (no internet, API failures)

---

**Ready to start?** The complete codebase is here, the iOS prototype works, and all the technical details are documented. Let's build an amazing iOS app! 🚀 