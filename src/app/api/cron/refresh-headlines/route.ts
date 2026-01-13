import { NextResponse } from 'next/server';
import { fetchHeadlinesWithClaude } from '@/utils/claude-agent';
import { writeHeadlinesCache, readHeadlinesCache } from '@/utils/headlines-cache';

// Configure runtime for longer execution time
// Note: This allows the BACKGROUND job to run for up to 5 minutes
// The HTTP response is returned immediately (< 1 second)
export const maxDuration = 300; // 5 minutes for Claude agent background job
export const dynamic = 'force-dynamic';

/**
 * Cron endpoint to refresh headlines daily
 *
 * ARCHITECTURE: Fire-and-Forget Pattern
 * ======================================
 * This endpoint uses a "fire-and-forget" pattern to work around cron job timeout limits:
 *
 * 1. Cron job calls this endpoint (must respond within 30 seconds on free tier)
 * 2. This endpoint starts the headline refresh in the background (no await)
 * 3. This endpoint responds immediately: "Job started!" (< 1 second)
 * 4. Cron job sees success response and completes
 * 5. Background refresh continues for 60-120 seconds
 * 6. Headlines are saved to cache when complete
 *
 * WHY THIS WORKS:
 * - Render runs a long-lived Node.js process (not pure serverless)
 * - Background work continues even after HTTP response is sent
 * - Cron job only requires an HTTP response within 30s, not completion of work
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
    // Read existing cache for logging
    const existingCache = await readHeadlinesCache();
    console.log(`📋 [CRON] Existing cache: ${existingCache ? 'found' : 'not found'}`);

    // CRITICAL: Start the refresh in the background (fire-and-forget)
    // By NOT awaiting this promise, we can respond immediately to the cron job
    // The work continues in the background even after we return the HTTP response
    const timestamp = new Date().toISOString();
    console.log('🔄 [CRON] Starting background headline refresh...');

    // Fire and forget - NOTE: We do NOT await this!
    // This allows the function to return immediately while work continues
    refreshHeadlinesInBackground().catch(error => {
      // We still catch errors for logging, but they won't affect the HTTP response
      console.error('❌ [CRON] Background refresh failed:', error);
    });

    // Respond immediately to the cron job (within 30s limit)
    // The cron job will see this response in < 1 second and mark the job as successful
    // Meanwhile, the background refresh continues for 60-120 seconds
    return NextResponse.json({
      success: true,
      message: 'Headline refresh started in background',
      timestamp,
      previousCache: existingCache ? {
        count: existingCache.headlines.length,
        lastFetch: existingCache.lastFetch,
        strategy: existingCache.strategy
      } : null
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [CRON] Error starting refresh:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start headline refresh',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Background function to refresh headlines
 *
 * This function runs AFTER the HTTP response has been sent to the cron job.
 * It can take 60-120 seconds to complete, which is fine because:
 * 1. The cron job already got its response and completed successfully
 * 2. Render's Node.js process keeps running (not true serverless)
 * 3. The maxDuration=300 setting allows this to run for up to 5 minutes
 *
 * Flow:
 * 1. Calls Claude API to search for news (uses Brave API for searches)
 * 2. Claude makes multiple search queries in an agentic loop (up to 10 iterations)
 * 3. Curates 20 best headlines from search results
 * 4. Saves to cache file for the frontend to read
 */
async function refreshHeadlinesInBackground() {
  console.log('🔄 [BACKGROUND] Starting headline fetch...');
  const startTime = Date.now();

  try {
    // This is the slow part: Multiple API calls to Claude + Brave Search
    // Can take 60-120 seconds depending on how many searches Claude does
    const headlines = await fetchHeadlinesWithClaude();
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`✅ [BACKGROUND] Fetched ${headlines.length} headlines in ${duration}s`);

    // Save to cache file so the frontend can read it
    await writeHeadlinesCache({
      headlines,
      lastFetch: new Date().toISOString(),
      strategy: 'claude-agent'
    });

    console.log('🎉 [BACKGROUND] Headlines cache updated successfully');
    console.log(`📊 [BACKGROUND] Sample headlines:`, headlines.slice(0, 3));

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [BACKGROUND] Error refreshing headlines:', errorMessage);
    // Error is logged but doesn't affect cron job (which already completed)
    throw error;
  }
}

/**
 * Also support POST for cron services that use POST
 */
export async function POST(request: Request) {
  return GET(request);
}
