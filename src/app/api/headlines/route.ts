import { NextResponse } from 'next/server';
import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_API_URL = process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
}

interface CachedHeadlines {
  headlines: string[];
  lastFetch: string;
  strategy: string;
}

// In-memory cache (will reset on server restart, but that's fine for daily refresh)
let headlineCache: CachedHeadlines | null = null;

// Utility function to check if we need to refresh headlines
function needsRefresh(): boolean {
  if (!headlineCache) {
    console.log('📰 [CACHE] No cache found, need to fetch headlines');
    return true;
  }

  const now = new Date();
  const lastFetch = new Date(headlineCache.lastFetch);
  
  // Get today's 6am ET (11am UTC considering EST, 10am UTC during EDT)
  const todayAt6amET = new Date();
  
  // Determine if we're in EST or EDT
  const isEDT = isEasternDaylightTime(now);
  const utcOffset = isEDT ? 10 : 11; // EDT = UTC-4 (so 6am ET = 10am UTC), EST = UTC-5 (so 6am ET = 11am UTC)
  
  todayAt6amET.setUTCHours(utcOffset, 0, 0, 0);
  
  // If current time is before today's 6am ET, use yesterday's 6am ET as the refresh time
  if (now < todayAt6amET) {
    todayAt6amET.setUTCDate(todayAt6amET.getUTCDate() - 1);
  }
  
  const shouldRefresh = lastFetch < todayAt6amET;
  
  console.log('🕐 [CACHE] Refresh check:', {
    now: now.toISOString(),
    lastFetch: lastFetch.toISOString(),
    todayAt6amET: todayAt6amET.toISOString(),
    isEDT,
    utcOffset,
    shouldRefresh,
    cacheAge: Math.round((now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60)) + 'h'
  });
  
  return shouldRefresh;
}

// Helper function to determine if we're in Eastern Daylight Time
function isEasternDaylightTime(date: Date): boolean {
  // DST in US runs from second Sunday in March to first Sunday in November
  const year = date.getFullYear();
  
  // Second Sunday in March
  const march = new Date(year, 2, 1); // March 1st
  const dstStart = new Date(year, 2, 14 - march.getDay()); // Second Sunday
  
  // First Sunday in November  
  const november = new Date(year, 10, 1); // November 1st
  const dstEnd = new Date(year, 10, 7 - november.getDay()); // First Sunday
  
  return date >= dstStart && date < dstEnd;
}

// Utility function to add delay for rate limiting
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Single Brave search with error handling
async function performSingleBraveSearch(): Promise<SearchResult[]> {
  try {
    console.log('🔍 [API] Performing SINGLE Brave Search (rate-limit friendly)...');
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: 'AI news 2025 OpenAI Anthropic Meta Google Nvidia artificial intelligence latest',
        count: 20, // Get more results in single query
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

    console.log('✅ [API] Single Brave Search Status:', response.status);
    
    const results = response.data?.web?.results || [];
    console.log('📰 [API] Single Brave Search Results:', results.length);
    
    return results.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      page_age: item.age || ''
    }));
    
  } catch (error: any) {
    console.error('❌ [API] Single Brave Search Error:', error.message);
    
    if (error.response?.data) {
      console.log('🔍 [API] Error Details:', {
        status: error.response.status,
        data: error.response.data,
        plan: error.response.data?.error?.meta?.plan,
        rate_limit: error.response.data?.error?.meta?.rate_limit,
        rate_current: error.response.data?.error?.meta?.rate_current,
      });
    }
    
    throw error;
  }
}

// Perplexity fallback for when Brave fails
async function performPerplexityFallback(): Promise<string[]> {
  try {
    console.log('🚀 [API] Using Perplexity fallback for headlines...');
    
    const prompt = `List 20 recent AI and technology news headlines from the past week. 

Focus on:
- AI product launches and major feature releases (ChatGPT, Claude, Gemini, etc.)
- AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia)
- AI startup funding rounds, acquisitions, and partnerships
- New AI model releases and capability upgrades
- AI hardware and chip announcements

Format: **Headline** (Date)
Return only the numbered list, no other text.`;

    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${PPLX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    console.log('✅ [API] Perplexity fallback successful');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    const headlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 [API] Perplexity headlines:', headlines.length);
    return headlines;
    
  } catch (error: any) {
    console.error('❌ [API] Perplexity fallback failed:', error.message);
    throw new Error('Both Brave and Perplexity failed');
  }
}

// GPT refinement of search results
async function refineWithGPT(searchResults: SearchResult[]): Promise<string[]> {
  try {
    console.log('🤖 [API] Refining search results with GPT-4o...');
    
    const headlines = searchResults.map((result, index) => 
      `${index + 1}. **${result.title}** ${result.description ? `- ${result.description}` : ''} (${result.url})`
    ).join('\n');
    
    const prompt = `Extract and format 15-20 AI and technology news headlines from these search results. Focus on recent, concrete developments.

Search Results:
${headlines}

Requirements:
- Only include AI-related news (products, companies, funding, models, hardware)
- Format: **Headline** (Date if available)  
- Prioritize recent and significant developments
- Remove duplicate or similar stories
- Return ONLY the numbered list, no explanations

Headlines:`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    console.log('✅ [API] GPT-4o refinement successful');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    const refinedHeadlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 [API] Refined headlines:', refinedHeadlines.length);
    return refinedHeadlines;
    
  } catch (error: any) {
    console.error('❌ [API] GPT refinement failed:', error.message);
    // Return raw titles as fallback
    return searchResults.map(result => result.title).filter(Boolean);
  }
}

// Function to fetch fresh headlines
async function fetchFreshHeadlines(): Promise<{ headlines: string[], strategy: string }> {
  console.log('🔄 [CACHE] Fetching fresh headlines...');
  
  let headlines: string[] = [];
  let strategy = '';
  
  // Strategy 1: Try single Brave search first
  try {
    console.log('🚀 [API] STRATEGY 1: Single Brave Search...');
    const searchResults = await performSingleBraveSearch();
    
    if (searchResults.length > 0) {
      headlines = await refineWithGPT(searchResults);
      strategy = 'brave_search';
      console.log('✅ [API] Strategy 1 successful! Headlines:', headlines.length);
    } else {
      throw new Error('No search results from Brave');
    }
    
  } catch (braveError: any) {
    console.log('⚠️ [API] Strategy 1 failed, trying Strategy 2...');
    
    // Strategy 2: Use Perplexity fallback
    if (PPLX_API_KEY) {
      try {
        console.log('🚀 [API] STRATEGY 2: Perplexity Fallback...');
        headlines = await performPerplexityFallback();
        strategy = 'perplexity_fallback';
        console.log('✅ [API] Strategy 2 successful! Headlines:', headlines.length);
      } catch (pplxError: any) {
        console.error('❌ [API] Strategy 2 also failed');
        throw new Error('All headline strategies failed');
      }
    } else {
      console.error('❌ [API] No Perplexity API key for fallback');
      throw braveError;
    }
  }
  
  // Ensure we have results
  if (!headlines || headlines.length === 0) {
    throw new Error('No headlines generated from any strategy');
  }
  
  return { headlines, strategy };
}

export async function GET() {
  console.log('🔌 [API] Headlines API route called');
  
  // Validate required environment variables at runtime
  if (!BRAVE_API_KEY) {
    console.error('❌ [API] BRAVE_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'BRAVE_API_KEY not configured' },
      { status: 500 }
    );
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ [API] OPENAI_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Check if we need to refresh headlines
    if (!needsRefresh() && headlineCache) {
      console.log('✅ [CACHE] Serving cached headlines');
      console.log('📋 [CACHE] Cache age:', Math.round((new Date().getTime() - new Date(headlineCache.lastFetch).getTime()) / (1000 * 60 * 60)) + 'h');
      
      return NextResponse.json({
        headlines: headlineCache.headlines,
        strategy: headlineCache.strategy,
        timestamp: headlineCache.lastFetch,
        cached: true,
        nextRefresh: 'Tomorrow at 6:00 AM ET'
      });
    }

    // Fetch fresh headlines
    console.log('🔄 [CACHE] Cache miss or stale, fetching fresh headlines...');
    const { headlines, strategy } = await fetchFreshHeadlines();
    
    // Update cache
    headlineCache = {
      headlines,
      lastFetch: new Date().toISOString(),
      strategy
    };
    
    console.log('🎉 [API] Fresh headlines fetched and cached:', headlines.length);
    console.log('📋 [API] Sample headlines:', headlines.slice(0, 3));
    
    return NextResponse.json({
      headlines,
      strategy,
      timestamp: headlineCache.lastFetch,
      cached: false,
      nextRefresh: 'Tomorrow at 6:00 AM ET'
    });
    
  } catch (error: any) {
    console.error('❌ [API] Complete failure:', error.message);
    
    // If we have cached headlines, serve them even if they're stale
    if (headlineCache) {
      console.log('🚨 [CACHE] Error occurred, serving stale cache as fallback');
      return NextResponse.json({
        headlines: headlineCache.headlines,
        strategy: headlineCache.strategy + '_fallback',
        timestamp: headlineCache.lastFetch,
        cached: true,
        error: 'Fresh fetch failed, serving cached headlines',
        nextRefresh: 'Tomorrow at 6:00 AM ET'
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch headlines',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
