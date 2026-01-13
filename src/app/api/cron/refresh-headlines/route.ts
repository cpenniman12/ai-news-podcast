import { NextResponse } from 'next/server';
import { fetchHeadlinesWithClaude } from '@/utils/claude-agent';
import { writeHeadlinesCache, readHeadlinesCache } from '@/utils/headlines-cache';

// Configure runtime for longer execution time
export const maxDuration = 60; // 60 seconds for Claude agent
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint to refresh headlines daily
 * Can be called by a cron service (like Render Cron Jobs or external cron-job.org)
 *
 * To use with Render:
 * 1. Add a cron job in render.yaml that hits this endpoint daily at 6am ET
 * 2. Or use an external service like cron-job.org to call this URL
 *
 * Authorization: Use CRON_SECRET env variable for basic security
 */
export async function GET(request: Request) {
  console.log('⏰ [CRON] Headlines refresh job triggered');

  // Simple authorization check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

  if (secret !== expectedSecret) {
    console.error('❌ [CRON] Unauthorized - invalid secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate required environment variables
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ [CRON] ANTHROPIC_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Read existing cache
    const existingCache = await readHeadlinesCache();
    console.log(`📋 [CRON] Existing cache: ${existingCache ? 'found' : 'not found'}`);

    // Fetch fresh headlines from Claude
    console.log('🔄 [CRON] Fetching fresh headlines with Claude Agent...');
    const startTime = Date.now();
    const headlines = await fetchHeadlinesWithClaude();
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ [CRON] Fetched ${headlines.length} headlines in ${duration}s`);

    // Write to cache file
    await writeHeadlinesCache({
      headlines,
      lastFetch: new Date().toISOString(),
      strategy: 'claude-agent'
    });

    console.log('🎉 [CRON] Headlines cache updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Headlines refreshed successfully',
      count: headlines.length,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
      previousCache: existingCache ? {
        count: existingCache.headlines.length,
        lastFetch: existingCache.lastFetch,
        strategy: existingCache.strategy
      } : null
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [CRON] Error refreshing headlines:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh headlines',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Also support POST for cron services that use POST
 */
export async function POST(request: Request) {
  return GET(request);
}
