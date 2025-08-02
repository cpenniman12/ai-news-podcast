# Future Enhancements

## Automated Daily Audio Generation System

### Overview
Transform the current user-selection model into an automated daily podcast generation system that pre-generates audio content for the top stories each day.

### Core Changes

#### 1. Daily Automated Generation (6 AM Schedule)
- **Timing**: Generate audio files automatically every day at 6:00 AM ET
- **Story Selection**: Automatically select the top 2 stories from the daily headline curation
- **No User Selection**: Eliminate the current story selection interface - stories are pre-selected by the system

#### 2. Story Curation Process (Enhanced)
- **Same Curation Pipeline**: Continue using RSS Feeds + Brave Search + Perplexity API → GPT-4o filtering
- **Reduced Output**: Instead of 20 headlines for user selection, curate down to exactly 2 top stories
- **Same Quality Standards**: Maintain current filtering criteria and quality standards
- **Auto-Selection Logic**: Use GPT-4o to select the 2 most compelling, diverse, and newsworthy stories

#### 3. Audio Generation Pipeline
- **Same TTS Process**: Continue using OpenAI TTS (tts-1-hd model) for audio generation
- **Same Script Generation**: Maintain current 300-450 word conversational podcast segments
- **Same Research Phase**: Continue researching each story with Brave Search (8 results per story)
- **Individual Audio Files**: Generate separate audio files for each of the 2 stories (no concatenation needed)

#### 4. User Experience Changes
- **Story Switching Interface**: Users can toggle between Story 1 and Story 2
- **Individual Audio Players**: Each story has its own audio player with full playback controls
- **Ready-to-Play Content**: No waiting for generation - content is pre-generated and immediately available
- **Fallback Handling**: If daily generation fails, display previous day's content or error state

#### 5. Database Integration (Supabase MCP)
- **Daily Episodes Table**: Store daily generated content with metadata
  - Date/timestamp
  - Story 1: title, script, audio URL, metadata
  - Story 2: title, script, audio URL, metadata
  - Generation status (pending, completed, failed)
  - Performance metrics
- **Audio Storage**: Use Supabase storage buckets for MP3 files
- **Data Retention**: Implement retention policy for old episodes
- **Status Tracking**: Monitor generation success/failure rates

#### 6. Technical Implementation Requirements

##### Backend Changes
- **Cron Job Setup**: Configure 6 AM ET scheduled task (Vercel Cron or similar)
- **Generation API**: Create `/api/generate-daily-podcast` endpoint
- **Fetch API**: Create `/api/daily-episode` endpoint to retrieve today's content
- **Error Handling**: Robust error handling and retry logic for failed generations
- **Monitoring**: Add logging and alerts for generation failures

##### Frontend Changes
- **Remove HeadlineSelector**: Eliminate story selection interface
- **Add DailyStories Component**: New component for displaying 2 pre-generated stories
- **Audio Player Updates**: Adapt AudioPlayer component for individual story playback
- **Loading States**: Handle loading states for daily content fetching
- **Error States**: Display appropriate messages when content unavailable

##### Database Schema
```sql
-- Daily episodes table
CREATE TABLE daily_episodes (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  story1_title TEXT NOT NULL,
  story1_script TEXT NOT NULL,
  story1_audio_url TEXT,
  story2_title TEXT NOT NULL,
  story2_script TEXT NOT NULL,
  story2_audio_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### 7. Development Phases

##### Phase 1: Backend Infrastructure
1. Set up Supabase MCP integration
2. Create database schema for daily episodes
3. Implement daily generation API endpoint
4. Set up cron job for 6 AM generation

##### Phase 2: Content Pipeline
1. Modify headline curation to select top 2 stories
2. Update script generation for individual stories
3. Implement audio generation for 2 separate files
4. Add Supabase storage integration

##### Phase 3: Frontend Updates
1. Create DailyStories component
2. Remove HeadlineSelector component
3. Update routing and navigation
4. Add error and loading states

##### Phase 4: Testing & Optimization
1. Test automated generation pipeline
2. Monitor generation success rates
3. Optimize for reliability and speed
4. Add monitoring and alerting

#### 8. Benefits
- **Improved User Experience**: Instant access to content, no waiting for generation
- **Consistent Content**: Daily fresh content without user intervention
- **Reduced Server Load**: Pre-generation spreads computational load
- **Better Curation**: Automated selection ensures consistent quality
- **Simplified Interface**: Cleaner, more focused user experience

#### 9. Success Metrics
- **Generation Success Rate**: Target 95%+ successful daily generations
- **User Engagement**: Measure story completion rates
- **Content Quality**: Monitor user feedback on auto-selected stories
- **System Reliability**: Track uptime and error rates

---

*This enhancement maintains the core value proposition of AI-curated news podcasts while eliminating friction in the user experience through automation and pre-generation.*