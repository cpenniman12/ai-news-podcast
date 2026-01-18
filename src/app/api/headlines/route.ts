import { NextResponse } from 'next/server';
import { getHeadlinesWithFallback } from '@/utils/headlines-cache';

// Configure runtime
export const maxDuration = 5; // 5 seconds - just read from cache
export const dynamic = 'force-dynamic'; // Disable caching at the Next.js level

export async function GET() {
  console.log('🔌 [API] Headlines API route called');

  try {
    // Always return immediately from cache or fallback
    const result = await getHeadlinesWithFallback();

    console.log(`✅ [API] Serving ${result.cached ? 'cached' : 'fallback'} headlines:`, result.headlines.length);
    console.log('📋 [API] Sample headlines:', result.headlines.slice(0, 3));

    return NextResponse.json({
      headlines: result.headlines,
      strategy: result.strategy,
      timestamp: result.timestamp,
      cached: result.cached,
      nextRefresh: 'Tomorrow at 6:00 AM ET'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [API] Error serving headlines:', errorMessage);

    return NextResponse.json(
      {
        error: 'Failed to serve headlines',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
