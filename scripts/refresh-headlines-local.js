/**
 * Local script to refresh headlines without timeout limits
 * Run with: node scripts/refresh-headlines-local.js
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  console.log('🚀 [LOCAL] Starting headline refresh...');
  console.log(`⏰ [LOCAL] Time: ${new Date().toISOString()}`);

  // Validate environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ [LOCAL] ANTHROPIC_API_KEY is required in .env.local');
    process.exit(1);
  }

  if (!process.env.BRAVE_API_KEY) {
    console.warn('⚠️ [LOCAL] BRAVE_API_KEY not found - search may not work optimally');
  }

  try {
    // Import the modules (using dynamic import for ESM compatibility)
    const { fetchHeadlinesWithClaude } = await import('../src/utils/claude-agent.ts');
    const { writeHeadlinesCache, readHeadlinesCache } = await import('../src/utils/headlines-cache.ts');

    // Read existing cache
    const existingCache = await readHeadlinesCache();
    console.log(`📋 [LOCAL] Existing cache: ${existingCache ? 'found' : 'not found'}`);
    if (existingCache) {
      console.log(`   - ${existingCache.headlines.length} headlines`);
      console.log(`   - Last fetch: ${existingCache.lastFetch}`);
    }

    // Fetch fresh headlines
    console.log('\n🔄 [LOCAL] Fetching fresh headlines with Claude Agent...');
    const startTime = Date.now();
    const headlines = await fetchHeadlinesWithClaude();
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n✅ [LOCAL] Fetched ${headlines.length} headlines in ${duration}s`);

    // Write to cache
    await writeHeadlinesCache({
      headlines,
      lastFetch: new Date().toISOString(),
      strategy: 'claude-agent'
    });

    console.log('\n🎉 [LOCAL] Headlines cache updated successfully!');
    console.log('\n📰 [LOCAL] Sample headlines:');
    headlines.slice(0, 5).forEach((h, i) => {
      console.log(`   ${i + 1}. ${h}`);
    });

    console.log(`\n✅ [LOCAL] Done! Total time: ${duration}s`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ [LOCAL] Error refreshing headlines:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
