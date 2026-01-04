import { NextResponse } from 'next/server';
import { fetchHeadlinesWithClaude } from '@/utils/claude-agent';

// Configure runtime for longer execution time
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic'; // Disable caching at the Next.js level

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

// Fetch fresh headlines using Claude
async function fetchFreshHeadlines(): Promise<{ headlines: string[], strategy: string }> {
  console.log('🔄 [CACHE] Fetching fresh headlines with Claude...');

  const headlines = await fetchHeadlinesWithClaude();
  
  console.log(`📊 [Claude] Fetched ${headlines.length} headlines`);
  
  return { headlines, strategy: 'claude-agent' };
}

export async function GET(request: Request) {
  console.log('🔌 [API] Headlines API route called');
  
  // Check for force refresh parameter
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';
  
  // Validate required environment variables at runtime
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ [API] ANTHROPIC_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
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

    // Fetch fresh headlines from Claude
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
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [API] Complete failure:', errorMessage);
    
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
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
