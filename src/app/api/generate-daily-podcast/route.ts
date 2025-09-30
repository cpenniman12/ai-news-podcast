import { NextResponse } from 'next/server';
import axios from 'axios';
import { 
  ensureAudioBucket, 
  saveDailyEpisode, 
  getDailyEpisode, 
  updateEpisodeStatus,
  type StoryContent 
} from '@/utils/supabase/storage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

interface CuratedHeadline {
  title: string;
  relevanceScore: number;
}

/**
 * Fetch and curate headlines, then select top 2 stories
 */
async function selectTopStories(): Promise<string[]> {
  try {
    console.log('📰 [Daily] Fetching fresh headlines for story selection...');
    
    // Reuse existing headlines API with force refresh
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/headlines?refresh=true`);
    
    if (!response.ok) {
      throw new Error(`Headlines API returned ${response.status}`);
    }
    
    const data = await response.json();
    const headlines = data.headlines as string[];
    
    console.log(`📊 [Daily] Received ${headlines.length} curated headlines`);
    
    // Additional filtering for daily selection - pick top 2 most actionable stories
    const prompt = `You are selecting the 2 BEST AI news stories for a daily podcast targeting AI builders and entrepreneurs.

From the following ${headlines.length} pre-curated headlines, select exactly 2 stories that are:

1. **Most Actionable**: Stories builders can immediately use or learn from
2. **Highest Impact**: Major announcements from leading companies
3. **Complementary**: Choose different story types (e.g., one model release + one funding/partnership)
4. **Recent**: Prioritize the most recent developments
5. **Specific**: Concrete developments over vague announcements

GUIDELINES:
- Prioritize model releases, developer tools, major funding, and strategic partnerships
- Avoid two stories from the same company
- Prefer stories with clear business implications
- Choose stories that complement each other (different categories)

HEADLINES TO CHOOSE FROM:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Return exactly 2 headlines in this format:
1. [Full headline text]
2. [Full headline text]

Select the 2 BEST stories for today's podcast:`;

    console.log('🤖 [Daily] Asking GPT-4o to select top 2 stories...');
    
    const gptResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI news curator who selects the most important stories for AI builders and entrepreneurs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const selectionContent = gptResponse.data.choices?.[0]?.message?.content || '';
    console.log('📝 [Daily] GPT selection response:', selectionContent);
    
    // Parse the selected headlines
    const selectedHeadlines = selectionContent
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 2); // Ensure exactly 2

    if (selectedHeadlines.length !== 2) {
      console.warn('⚠️ [Daily] GPT did not return exactly 2 stories, falling back to first 2');
      return headlines.slice(0, 2);
    }

    console.log('✅ [Daily] Selected 2 top stories:');
    selectedHeadlines.forEach((headline, i) => {
      console.log(`  ${i + 1}. ${headline}`);
    });

    return selectedHeadlines;
    
  } catch (error) {
    console.error('❌ [Daily] Error selecting top stories:', error);
    throw error;
  }
}

/**
 * Research a story using Brave Search
 */
async function researchStory(headline: string): Promise<string> {
  try {
    console.log(`🔍 [Daily] Researching story: ${headline.slice(0, 100)}...`);
    
    // Extract key terms for search
    const searchQuery = headline
      .replace(/\*\*/g, '') // Remove markdown
      .replace(/\(.*?\)/g, '') // Remove date parentheses
      .trim();

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: searchQuery,
        count: 5,
        offset: 0,
        safesearch: 'moderate',
        search_lang: 'en',
        country: 'US',
        freshness: 'pw', // Past week
      },
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const results = response.data?.web?.results || [];
    console.log(`📊 [Daily] Found ${results.length} research results for story`);
    
    // Format research results
    const researchContent = results
      .slice(0, 3) // Top 3 results
      .map((result: any, index: number) => {
        return `**Source ${index + 1}**: ${result.title}\n${result.description || 'No description available'}\nURL: ${result.url}`;
      })
      .join('\n\n');

    return researchContent;
    
  } catch (error) {
    console.error('❌ [Daily] Error researching story:', error);
    return 'Research data temporarily unavailable.';
  }
}

/**
 * Generate script for a story
 */
async function generateStoryScript(headline: string, research: string): Promise<string> {
  try {
    console.log(`✍️ [Daily] Generating script for: ${headline.slice(0, 100)}...`);
    
    const prompt = `Create a compelling 300-450 word podcast script for this AI news story.

HEADLINE: ${headline}

RESEARCH CONTEXT:
${research}

REQUIREMENTS:
- Write in a conversational, engaging tone for AI builders and entrepreneurs
- Start with a strong hook that explains why this matters
- Include specific details, numbers, and company names when available
- Explain the practical implications for the audience
- End with a forward-looking statement about impact
- Write as if speaking directly to the listener
- Keep it informative but accessible
- Focus on what builders can learn or act on

TARGET AUDIENCE: AI builders, developers, entrepreneurs, and tech leaders who want actionable insights

Write the complete podcast script:`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert podcast script writer specializing in AI and technology news for builders and entrepreneurs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const script = response.data.choices?.[0]?.message?.content || '';
    console.log(`✅ [Daily] Generated script (${script.length} chars)`);
    
    return script;
    
  } catch (error) {
    console.error('❌ [Daily] Error generating script:', error);
    throw error;
  }
}

/**
 * Generate audio from script using OpenAI TTS
 */
async function generateAudio(script: string): Promise<Buffer> {
  try {
    console.log(`🎤 [Daily] Generating audio (${script.length} chars)...`);
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1-hd',
        voice: 'nova',
        input: script,
        response_format: 'mp3',
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );

    const audioBuffer = Buffer.from(response.data);
    console.log(`✅ [Daily] Generated audio (${audioBuffer.length} bytes)`);
    
    return audioBuffer;
    
  } catch (error) {
    console.error('❌ [Daily] Error generating audio:', error);
    throw error;
  }
}

/**
 * Extract title from headline
 */
function extractTitle(headline: string): string {
  // Remove markdown formatting and date info
  return headline
    .replace(/\*\*/g, '')
    .replace(/\(.*?\)$/, '')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Main function to generate daily podcast
 */
async function generateDailyPodcast(date: string): Promise<void> {
  try {
    console.log(`🚀 [Daily] Starting daily podcast generation for ${date}`);
    
    // Update status to generating
    await updateEpisodeStatus(date, 'generating');
    
    // Ensure storage bucket exists
    await ensureAudioBucket();
    
    // Step 1: Select top 2 stories
    const selectedHeadlines = await selectTopStories();
    
    // Step 2: Process each story
    const stories: StoryContent[] = [];
    
    for (let i = 0; i < selectedHeadlines.length; i++) {
      const headline = selectedHeadlines[i];
      console.log(`📖 [Daily] Processing story ${i + 1}/2: ${headline.slice(0, 80)}...`);
      
      try {
        // Research the story
        const research = await researchStory(headline);
        
        // Generate script
        const script = await generateStoryScript(headline, research);
        
        // Generate audio
        const audioBuffer = await generateAudio(script);
        
        // Create story content
        const story: StoryContent = {
          title: extractTitle(headline),
          script,
          audioBuffer,
          duration: Math.ceil(script.length / 20) // Rough estimate: ~20 chars per second
        };
        
        stories.push(story);
        console.log(`✅ [Daily] Completed story ${i + 1}/2`);
        
        // Add delay between stories to respect rate limits
        if (i < selectedHeadlines.length - 1) {
          console.log('⏳ [Daily] Waiting 3 seconds before next story...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (storyError) {
        console.error(`❌ [Daily] Error processing story ${i + 1}:`, storyError);
        throw storyError;
      }
    }
    
    // Step 3: Save to database and storage
    if (stories.length === 2) {
      await saveDailyEpisode(date, stories[0], stories[1], selectedHeadlines.length);
      console.log(`🎉 [Daily] Successfully generated daily podcast for ${date}`);
    } else {
      throw new Error(`Expected 2 stories, got ${stories.length}`);
    }
    
  } catch (error) {
    console.error(`💥 [Daily] Error generating daily podcast:`, error);
    await updateEpisodeStatus(date, 'failed', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`📅 [API] Daily podcast generation requested for ${targetDate}`);
    
    // Check if episode already exists
    const existingEpisode = await getDailyEpisode(targetDate);
    if (existingEpisode?.generation_status === 'completed') {
      console.log(`✅ [API] Episode already exists for ${targetDate}`);
      return NextResponse.json({
        message: 'Episode already exists',
        episode: existingEpisode,
        cached: true
      });
    }
    
    // Generate the daily podcast
    await generateDailyPodcast(targetDate);
    
    // Fetch the completed episode
    const completedEpisode = await getDailyEpisode(targetDate);
    
    return NextResponse.json({
      message: 'Daily podcast generated successfully',
      episode: completedEpisode,
      cached: false
    });
    
  } catch (error: any) {
    console.error('❌ [API] Daily podcast generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate daily podcast',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    console.log(`🔍 [API] Fetching daily episode for ${date}`);
    
    const episode = await getDailyEpisode(date);
    
    if (!episode) {
      return NextResponse.json(
        { error: 'No episode found for this date' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      episode,
      cached: true
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error fetching daily episode:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily episode',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}