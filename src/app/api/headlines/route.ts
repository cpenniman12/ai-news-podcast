import { NextResponse } from 'next/server';
import { getCachedHeadlines, forceRefresh, getHeadlinesWithWait } from '@/utils/headlines-cache';

// Configure runtime for longer execution time
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('🔌 [API] Headlines API route called');
  
  const url = new URL(request.url);
  const forceRefreshParam = url.searchParams.get('refresh') === 'true';
  const wait = url.searchParams.get('wait') === 'true';
  
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
    // Force refresh if requested
    if (forceRefreshParam) {
      console.log('🔄 [API] Force refresh requested');
      await forceRefresh();
    }

    // Get headlines - either wait for them or return immediately from cache
    if (wait) {
      console.log('⏳ [API] Waiting for headlines...');
      const data = await getHeadlinesWithWait();
      return NextResponse.json({
        ...data,
        nextRefresh: 'Tomorrow at 6:00 AM ET'
      });
    }

    // Return cached headlines immediately (non-blocking)
    const data = getCachedHeadlines();
    
    console.log(`📋 [API] Returning ${data.headlines.length} headlines, cached: ${data.cached}, loading: ${data.isLoading}`);
    
    return NextResponse.json({
      headlines: data.headlines,
      timestamp: data.timestamp,
      cached: data.cached,
      isLoading: data.isLoading,
      nextRefresh: 'Tomorrow at 6:00 AM ET'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [API] Error:', errorMessage);
    
    // Try to return cached data even on error
    const cached = getCachedHeadlines();
    if (cached.headlines.length > 0 && cached.cached) {
      console.log('🚨 [API] Serving stale cache as fallback');
      return NextResponse.json({
        headlines: cached.headlines,
        timestamp: cached.timestamp,
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
