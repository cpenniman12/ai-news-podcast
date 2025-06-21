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
      console.log(`📰 [RSS] Processing feed: ${feedUrl} - Found ${feed.items?.length || 0} total items`);
      
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
            const formattedHeadline = `**${item.title}** (${dateStr})`;
            allHeadlines.push(formattedHeadline);
            console.log(`📰 [RSS] Added: ${formattedHeadline}`);
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
  console.log(`📰 [RSS] Fetched ${allHeadlines.length} headlines from ${RSS_FEEDS.length} feeds.`);
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
    
    console.log('🔍 [Brave] Raw search results:');
    results.forEach((item: any, index: number) => {
      console.log(`${index + 1}. Title: ${item.title || 'No title'}`);
      console.log(`   URL: ${item.url || 'No URL'}`);
      console.log(`   Description: ${item.description || 'No description'}`);
      console.log(`   Age: ${item.age || 'No age'}`);
      console.log('   ---');
    });
    
    const mappedResults = results.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      page_age: item.age || ''
    }));

    console.log(`📰 [Brave] Mapped ${mappedResults.length} search results.`);
    return mappedResults;
    
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

// Enhanced Perplexity headlines with multiple targeted searches
async function fetchPerplexityHeadlines(): Promise<string[]> {
  const allHeadlines: string[] = [];
  
  // Define multiple targeted prompts based on our GPT-4o curation criteria
  const prompts = [
    {
      name: "AI Agents & Developer Tools",
      prompt: `List specific AI agent and developer tool announcements from the past 7 days. Focus on:
- Specific companies launching new agentic AI capabilities (OpenAI, Anthropic, Google, etc.)
- Named AI agent platforms and SDKs with company attribution
- Specific developer APIs and tools from identifiable companies
- Named AI coding assistants from specific companies
Must include: company name, specific product/tool name, launch date. Format: **[Company] [Specific Action/Product]** (Date)`
    },
    {
      name: "AI Model Releases & Capabilities", 
      prompt: `List specific AI model releases and capability announcements from the past 7 days. Focus on:
- Named AI model versions from specific companies (OpenAI GPT-X, Anthropic Claude-X, Google Gemini-X, etc.)
- Specific multimodal AI capabilities from identifiable companies
- Named performance improvements with company attribution
- Specific AI reasoning capabilities from named companies
Must include: company name, specific model name, capability, release date. Format: **[Company] [Specific Model/Capability]** (Date)`
    },
    {
      name: "AI Hardware & Chips",
      prompt: `List specific AI hardware and chip announcements from the past 7 days. Focus on:
- Named AI chips from specific companies (Nvidia, AMD, Intel, Apple, etc.)
- Specific AI server announcements with company names
- Named hardware partnerships between identifiable companies
- Specific performance breakthroughs with company attribution
Must include: company names, specific chip/hardware names, partnerships, announcement date. Format: **[Company] [Specific Hardware/Partnership]** (Date)`
    },
    {
      name: "AI Funding & Strategic Moves",
      prompt: `List specific AI startup funding and strategic moves from the past 7 days. Focus on:
- Named AI companies raising specific funding amounts ($50M+)
- Specific AI acquisitions between named companies
- Named executives/researchers moving between specific companies
- Specific corporate AI investments with company names
Must include: company names, specific amounts, executive names, announcement date. Format: **[Company] [Specific Action/Amount]** (Date)`
    },
    {
      name: "AI Product Launches",
      prompt: `List specific AI product launches from the past 7 days. Focus on:
- Named consumer AI products from specific companies
- Specific enterprise AI platforms from identifiable companies
- Named AI integrations in products from specific companies (Apple, Google, Microsoft, etc.)
- Specific AI demos or applications from named companies
Must include: company name, specific product name, launch date. Format: **[Company] [Specific Product/Integration]** (Date)`
    }
  ];

  // Make sequential calls to Perplexity with delays to respect rate limits
  for (let i = 0; i < prompts.length; i++) {
    const { name, prompt } = prompts[i];
    
    try {
      console.log(`🚀 [Perplexity] Fetching ${name} (${i + 1}/${prompts.length})...`);
      console.log(`📝 [Perplexity] ${name} prompt:`);
      console.log(prompt);

      const response = await axios.post(
        PPLX_API_URL,
        {
          model: 'sonar-pro',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
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
      console.log(`📰 [Perplexity] ${name} raw response:`);
      console.log(content);
      
      const headlines = content
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
      
      console.log(`✅ [Perplexity] ${name}: ${headlines.length} headlines`);
      allHeadlines.push(...headlines);
      
      // Add delay between requests to respect rate limits (except for last request)
      if (i < prompts.length - 1) {
        console.log(`⏳ [Perplexity] Waiting 2 seconds before next category...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error: any) {
      console.error(`❌ [Perplexity] Error fetching ${name}:`, error.message);
      // Continue with other categories even if one fails
    }
  }

  console.log(`📰 [Perplexity] Total fetched: ${allHeadlines.length} headlines from ${prompts.length} categories`);
  return allHeadlines;
}

// New function: send all headlines to GPT-4o for curation
async function curateAllHeadlinesWithGPT(
  braveHeadlines: string[],
  perplexityHeadlines: string[],
  rssHeadlines: string[]
): Promise<string[]> {
  const prompt = `You are an expert AI news curator finding the most significant developments that show where AI is heading. Select the 20 BEST headlines that tech enthusiasts and builders would want to read about AI progress and innovation.

PRIORITIZE THESE HIGH-IMPACT STORIES:
- AI Agent developments - new agentic capabilities, frameworks, or breakthrough demos
- Notable AI talks/presentations - key industry figures sharing insights (Karpathy, Altman, etc.)
- Major product launches with clear user impact and new capabilities
- AI model releases - new versions, capabilities, or performance improvements
- Strategic partnerships and pivots - companies changing AI direction or major collaborations
- Significant funding rounds ($50M+) for AI startups building interesting technology
- AI chip/hardware advances that unlock new possibilities
- Developer tool launches - new APIs, SDKs, or platforms that enable builders
- Research breakthroughs that demonstrate new AI capabilities (not limitations/risks)
- Corporate AI strategy shifts - major investments, acquisitions, team moves

STRICT REQUIREMENTS:
- MUST mention specific company names, people, or organizations (OpenAI, Google, Meta, Nvidia, etc.)
- MUST be from the past 7 days maximum
- REJECT generic headlines like "Top 9 AI Agent Frameworks" or "New Developer APIs" without specific company attribution
- REJECT broad trend pieces or analysis without concrete company actions
- Each headline must point to a specific entity taking a specific action

AVOID:
- Lawsuits, regulatory battles, or legal disputes
- AI safety/doom content or studies about AI risks/deception
- European regulatory news
- Analysis pieces without concrete developments
- Retrospective investment summaries
- Generic trend pieces or listicles without specific company names

FOCUS ON:
- US-based developments primarily
- Stories from the past week only
- Concrete announcements with specific company names and details
- Innovation and capability advances from named entities
- What builders and developers can actually use or learn from

FORMAT: Return exactly 20 headlines in this format:
1. **Headline** (Date)
2. **Headline** (Date)
...etc

HEADLINES TO REVIEW:

--- BRAVE SEARCH RESULTS (${braveHeadlines.length} items) ---
${braveHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

--- PERPLEXITY AI RESULTS (${perplexityHeadlines.length} items) ---
${perplexityHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

--- RSS FEED RESULTS (${rssHeadlines.length} items) ---
${rssHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Return only the numbered list of 20 refined headlines with no additional text.`;

  console.log('\n\n---📬 START OF GPT-4o PROMPT---');
  console.log('---INSTRUCTIONS---');
  console.log(prompt.split('HEADLINES TO REVIEW:')[0]);
  console.log(`---BRAVE SEARCH RESULTS (${braveHeadlines.length})---`);
  console.log(braveHeadlines.join('\n'));
  console.log(`---PERPLEXITY AI RESULTS (${perplexityHeadlines.length})---`);
  console.log(perplexityHeadlines.join('\n'));
  console.log(`---RSS FEED RESULTS (${rssHeadlines.length})---`);
  console.log(rssHeadlines.join('\n'));
  console.log('---END OF GPT-4o PROMPT---\n\n');

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

  console.log(`📊 [SOURCES] Fetched ${braveResults.length} results from Brave Search.`);
  console.log(`📊 [SOURCES] Fetched ${perplexityHeadlines.length} headlines from Perplexity.`);
  console.log(`📊 [SOURCES] Fetched ${rssHeadlines.length} headlines from RSS Feeds.`);

  // Combine all headlines (no deduplication)
  const braveHeadlinesMapped: string[] = braveResults.map(r => {
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
  });

  // Pass all to GPT-4o for curation
  const curated = await curateAllHeadlinesWithGPT(braveHeadlinesMapped, perplexityHeadlines, rssHeadlines);
  return { headlines: curated, strategy: 'brave+perplexity+rss' };
}

export async function GET(request: Request) {
  console.log('🔌 [API] Headlines API route called');
  
  // Check for force refresh parameter
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  
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
    if (!forceRefresh && !needsRefresh() && headlineCache) {
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
    if (forceRefresh) {
      console.log('🔄 [CACHE] Force refresh requested via ?refresh=true parameter');
    }
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