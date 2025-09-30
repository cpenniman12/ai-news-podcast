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
    },
    {
      name: "AI Research & Breakthroughs",
      prompt: `List specific AI research breakthroughs and scientific advances from the past 7 days. Focus on:
- Named research institutions or companies announcing AI breakthroughs
- Specific AI capabilities or performance improvements from identifiable sources
- Named researchers or teams making significant AI discoveries
- Specific AI applications in science, medicine, or technology from known organizations
Must include: institution/company name, researcher names, specific breakthrough, announcement date. Format: **[Institution/Company] [Specific Breakthrough]** (Date)`
    },
    {
      name: "AI Enterprise & Business",
      prompt: `List specific AI enterprise and business developments from the past 7 days. Focus on:
- Named companies deploying AI solutions in their operations
- Specific AI partnerships between identifiable businesses
- Named enterprises launching AI-powered services or products
- Specific AI adoption announcements from known corporations
Must include: company names, specific AI implementations, partnership details, announcement date. Format: **[Company] [Specific AI Implementation]** (Date)`
    },
    {
      name: "AI Talent & Leadership",
      prompt: `List specific AI talent and leadership moves from the past 7 days. Focus on:
- Named executives joining or leaving specific AI companies
- Specific researchers moving between identifiable institutions
- Named AI leaders making strategic announcements
- Specific hiring or team formation announcements from known companies
Must include: person names, company names, specific roles, announcement date. Format: **[Person] joins/leaves [Company] as [Role]** (Date)`
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

// Enhanced Brave search with multiple targeted queries
async function performMultipleBraveSearches(): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  
  const searchQueries = [
    {
      name: "AI Models & Releases",
      query: "OpenAI GPT Claude Anthropic Gemini Google AI model release 2025",
      count: 15
    },
    {
      name: "AI Hardware & Chips", 
      query: "Nvidia AMD Intel AI chips GPU hardware announcement 2025",
      count: 15
    },
    {
      name: "AI Startups & Funding",
      query: "AI startup funding Series A B C venture capital 2025",
      count: 15
    },
    {
      name: "AI Products & Integrations",
      query: "Apple Google Microsoft AI product launch integration 2025",
      count: 15
    },
    {
      name: "AI Agents & Tools",
      query: "AI agent autonomous coding assistant developer tools 2025",
      count: 15
    }
  ];

  for (let i = 0; i < searchQueries.length; i++) {
    const { name, query, count } = searchQueries[i];
    
    try {
      console.log(`🔍 [Brave] Performing ${name} search (${i + 1}/${searchQueries.length})...`);
      console.log(`🎯 [Brave] Query: ${query}`);
      
      const response = await axios.get(BRAVE_WEB_API_URL, {
        params: {
          q: query,
          count: count,
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

      console.log(`✅ [Brave] ${name} search status: ${response.status}`);
      
      const results = response.data?.web?.results || [];
      console.log(`📰 [Brave] ${name} found ${results.length} results`);
      
      console.log(`🔍 [Brave] ${name} raw search results:`);
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

      allResults.push(...mappedResults);
      
      // Add delay between searches to respect rate limits (except for last search)
      if (i < searchQueries.length - 1) {
        console.log(`⏳ [Brave] Waiting 3 seconds before next search...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error: any) {
      console.error(`❌ [Brave] Error in ${name} search:`, error.message);
      
      if (error.response?.data) {
        console.log(`🔍 [Brave] ${name} error details:`, {
          status: error.response.status,
          data: error.response.data,
          plan: error.response.data?.error?.meta?.plan,
          rate_limit: error.response.data?.error?.meta?.rate_limit,
          rate_current: error.response.data?.error?.meta?.rate_current,
        });
      }
      // Continue with other searches even if one fails
    }
  }
  
  console.log(`📰 [Brave] Total fetched: ${allResults.length} results from ${searchQueries.length} searches`);
  return allResults;
}

// New function: send all headlines to GPT-4o for curation
async function curateWithGPT(allHeadlines: string[]): Promise<string[]> {
  const prompt = `You are an expert AI news curator for a weekly podcast about artificial intelligence developments that builders and entrepreneurs care about.

CONTEXT: You will receive ~100-200 headlines from multiple sources (Perplexity AI searches, Brave web searches, RSS feeds). Your job is to select the 10 BEST headlines that represent the most important, discussion-worthy AI developments from the past week.

TARGET AUDIENCE: AI builders, entrepreneurs, developers, and tech leaders who want to stay current on:
- New AI capabilities they can use in their products
- Strategic moves by major AI companies
- Breakthrough research with practical implications
- Funding and business developments in AI
- New tools and platforms for AI development

STRICT REQUIREMENTS FOR SELECTION:
1. MUST point to a SPECIFIC company, person, or organization taking a SPECIFIC action
2. MUST be from the past 7 days (reject anything older)
3. MUST have concrete business or technical impact
4. MUST be an actual NEWS EVENT (announcement, launch, release, funding, acquisition, etc.)
5. ABSOLUTELY REJECT: Wikipedia pages, encyclopedia entries, reference documentation
6. ABSOLUTELY REJECT: Listicles like "Top 10 X", "Best Y for Z", "X Alternatives to Y"
7. ABSOLUTELY REJECT: How-to guides, tutorials, explainer articles, comparison articles
8. ABSOLUTELY REJECT: Generic trend pieces, opinion pieces, analysis pieces without news hook
9. REJECT regulatory battles, lawsuits, or AI safety controversies
10. REJECT vague headlines without clear company attribution
11. PRIORITIZE US-based companies and developments
12. FOCUS on innovation, progress, and what builders can actually use

PRIORITIZE THESE CATEGORIES (in order):
1. **AI Model Releases & Capabilities** - New models, performance improvements, multimodal features
2. **AI Agent & Developer Tools** - New platforms, APIs, coding assistants, agent frameworks
3. **AI Product Launches** - Consumer/enterprise products with AI features
4. **AI Hardware & Infrastructure** - Chips, servers, performance breakthroughs
5. **Strategic Business Moves** - Major funding, acquisitions, partnerships, executive moves
6. **Research Breakthroughs** - Scientific advances with clear practical applications
7. **AI Integrations** - Major platforms adding AI capabilities
8. **Enterprise AI Adoption** - Large companies deploying AI solutions

QUALITY FILTERS:
- Headlines must be specific and actionable
- Must mention real company/product names
- Must indicate recent timing (this week)
- Must have clear relevance to AI builders/entrepreneurs
- Avoid duplicates or very similar stories
- Prefer stories with concrete details over vague announcements

DIVERSITY REQUIREMENTS:
- Include stories from different companies (not all OpenAI/Google)
- Mix of different story types (models, tools, funding, products)
- Balance between big tech and startups
- Include hardware and software developments

EXAMPLES OF GOOD HEADLINES (these are the types we want):
- "NVIDIA to invest up to $100B in OpenAI" - Specific companies, specific action, specific amount
- "Claude Sonnet 4.5 released" - Specific product, specific version, concrete event
- "Anthropic raises $500M Series D led by Sequoia" - Specific company, specific funding, specific investors

EXAMPLES OF BAD HEADLINES (REJECT ALL OF THESE):
- "Best AI models for coding" - This is a listicle/comparison article, NOT news
- "20 alternatives to ChatGPT" - This is a listicle, NOT a news event
- "How to use Claude for programming" - This is a tutorial/how-to guide, NOT news
- "Wikipedia: History of AI" - This is reference documentation, NOT news
- "Understanding transformer models" - This is an explainer article, NOT news

OUTPUT FORMAT:
Return exactly 10 headlines, each on a new line, ranked by importance/relevance. Keep original headline text but ensure each one meets the strict requirements above. These should be HIGH QUALITY, NOTEWORTHY AI news headlines only.

HEADLINES TO CURATE:
${allHeadlines.join('\n')}

Please select and return the 10 BEST headlines that meet all the above criteria, ranked by importance for AI builders and entrepreneurs:`;

  try {
    console.log('🤖 [GPT] Starting headline curation...');
    console.log(`📊 [GPT] Processing ${allHeadlines.length} total headlines`);
    console.log('📝 [GPT] Full curation prompt:');
    console.log(prompt);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI news curator with deep knowledge of the AI industry, startup ecosystem, and what matters to builders and entrepreneurs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
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

    const curatedContent = response.data.choices?.[0]?.message?.content || '';
    console.log('📰 [GPT] Raw curated response:');
    console.log(curatedContent);
    
    // Parse the curated headlines
    const curatedHeadlines = curatedContent
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 10); // Ensure exactly 10 headlines

    console.log(`✅ [GPT] Curated ${curatedHeadlines.length} final headlines`);
    console.log('🎯 [GPT] Final curated headlines:');
    curatedHeadlines.forEach((headline: string, index: number) => {
      console.log(`${index + 1}. ${headline}`);
    });
    
    return curatedHeadlines;
    
  } catch (error: any) {
    console.error('❌ [GPT] Curation error:', error.message);
    
    if (error.response?.data) {
      console.log('🔍 [GPT] Error details:', {
        status: error.response.status,
        error: error.response.data.error,
      });
    }
    
    // Fallback: return first 10 headlines if GPT fails
    console.log('🔄 [GPT] Falling back to first 10 headlines...');
    return allHeadlines.slice(0, 10);
  }
}

// Updated fetchFreshHeadlines: fetch all sources in parallel, combine, curate
async function fetchFreshHeadlines(): Promise<{ headlines: string[], strategy: string }> {
  console.log('🔄 [CACHE] Fetching fresh headlines (Brave + Perplexity + RSS)...');

  // Fetch all sources in parallel
  const [braveResults, perplexityHeadlines, rssHeadlines] = await Promise.all([
    performMultipleBraveSearches(),
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
  const curated = await curateWithGPT(braveHeadlinesMapped.concat(perplexityHeadlines, rssHeadlines));
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