import { NextResponse } from 'next/server';
import axios from 'axios';
import Parser from 'rss-parser';

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

// List of RSS feeds to fetch
const RSS_FEEDS = [
  'https://feeds.simplecast.com/AuWJKpna', // a16z
  'https://updates.midjourney.com/rss/', // Midjourney
  'https://blog.google/technology/ai/rss/', // Google AI
  'https://about.fb.com/news/rss/', // Meta AI
  'https://www.techmeme.com/feed.xml', // TechMeme
  'https://technode.com/feed/', // TechNode
  'https://blogs.nvidia.com/feed/', // NVIDIA Blog
  'https://openai.com/blog/rss.xml', // OpenAI Blog
  'https://blog.waymo.com/rss.xml', // Waymo
  'https://www.sequoiacap.com/feed/', // Sequoia
];

// Fetch and parse all RSS feeds, filter for items published in the last 3 days
async function fetchRecentRssHeadlines(): Promise<string[]> {
  const parser = new Parser();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const allHeadlines: string[] = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        if (!item.title) continue;
        try {
          // Try to parse the date
          const pubDateRaw = item.isoDate || item.pubDate;
          const pubDate = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null);
          if (!pubDate || isNaN(pubDate.getTime())) {
            console.warn(`[RSS DEBUG] Invalid date for item:`, { title: item.title, isoDate: item.isoDate, pubDate: item.pubDate });
            continue;
          }
          if (pubDate >= threeDaysAgo) {
            // Format: **Headline** (Date)
            const dateStr = pubDate.toISOString().split('T')[0];
            allHeadlines.push(`**${item.title}** (${dateStr})`);
          }
        } catch (itemErr) {
          console.warn(`[RSS DEBUG] Exception parsing item:`, { title: item.title, isoDate: item.isoDate, pubDate: item.pubDate, error: itemErr });
          continue;
        }
      }
    } catch (err) {
      console.error(`[RSS] Failed to fetch or parse: ${feedUrl}`, err);
    }
  }
  return allHeadlines;
}

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

// Fetch headlines from Perplexity with the new, broader prompt
async function fetchPerplexityHeadlines(): Promise<string[]> {
  try {
    const prompt = `List a few dozen AI and technology news headlines from the past week.\n\nFocus exclusively on:\n- AI product launches, feature releases, and API updates (e.g., ChatGPT, Claude, Gemini, Copilot, etc.)\n- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.)\n- AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires\n- AI-related venture capital deals, public market moves, or major contracts\n- New AI model releases or significant capability upgrades\n- Developer tool integrations and platform partnerships\n- AI chip/hardware announcements from Nvidia, AMD, Intel, etc.\n\nRequirements:\n- Include stories with specific dates within the past week\n- Each headline must represent a concrete, actionable development\n- Prioritize official announcements over speculation or rumors\n- Include funding amounts, version numbers, or other specific details when available\n- Remove duplicate or very similar stories\n\nFormat: **Headline** (Date)`;

    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
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

    const content = response.data.choices?.[0]?.message?.content || '';
    const headlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
    return headlines;
  } catch (error: any) {
    console.error('[Perplexity] Error fetching headlines:', error.message);
    return [];
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

// New function: send all headlines to GPT-4o for curation
async function curateAllHeadlinesWithGPT(allHeadlines: string[]): Promise<string[]> {
  const prompt = `You are an expert AI news curator. I have gathered a large set of potential AI and technology news headlines from web search, Perplexity, and top industry RSS feeds. Please review them and select the 20 BEST headlines that match these specific criteria:

FOCUS EXCLUSIVELY ON:
- AI product launches, feature releases, and API updates (ChatGPT, Claude, Gemini, Copilot, etc.)
- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.)
- AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires
- AI-related venture capital deals, public market moves, or major contracts
- New AI model releases or significant capability upgrades
- Developer tool integrations and platform partnerships
- AI chip/hardware announcements from Nvidia, AMD, Intel, etc.

REQUIREMENTS:
- Include stories with specific dates within the past 2 weeks
- Each headline must represent a concrete, actionable development
- Prioritize official announcements over speculation or rumors
- Include funding amounts, version numbers, or other specific details when available
- Remove duplicate or very similar stories

FORMAT: Return exactly 20 headlines in this format:
1. **Headline** (Date)
2. **Headline** (Date)
...etc

HEADLINES TO REVIEW:

${allHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Return only the numbered list of 20 refined headlines with no additional text.`;

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );
  const content = response.data.choices?.[0]?.message?.content || '';
  return content
    .split('\n')
    .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

// Updated fetchFreshHeadlines: fetch all sources in parallel, combine, curate
async function fetchFreshHeadlines(): Promise<{ headlines: string[], strategy: string }> {
  console.log('🔄 [CACHE] Fetching fresh headlines (Brave + Perplexity + RSS)...');

  // Fetch all sources in parallel
  const [braveResults, perplexityHeadlines, rssHeadlines] = await Promise.all([
    performSingleBraveSearch(),
    fetchPerplexityHeadlines(),
    fetchRecentRssHeadlines(),
  ]);

  // Combine all headlines (no deduplication)
  const allHeadlines: string[] = [];
  // Brave: convert SearchResult to string, robust date handling
  allHeadlines.push(...braveResults.map(r => {
    let dateStr = 'Recent';
    if (r.page_age) {
      try {
        const d = new Date(r.page_age);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
              } catch (err) {
          // Silently handle date parsing errors
        }
    }
    return `**${r.title}** (${dateStr})`;
  }));
  // Perplexity: already string[]
  allHeadlines.push(...perplexityHeadlines);
  // RSS: already string[]
  allHeadlines.push(...rssHeadlines);

  // Pass all to GPT-4o for curation
  const curated = await curateAllHeadlinesWithGPT(allHeadlines);
  return { headlines: curated, strategy: 'brave+perplexity+rss' };
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

    // Fetch fresh headlines from all sources
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
