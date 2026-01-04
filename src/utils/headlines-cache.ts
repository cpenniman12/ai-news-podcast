/**
 * Server-side headline caching module
 * Maintains an in-memory cache with background refresh capabilities
 */

import { fetchHeadlinesWithClaude } from './claude-agent';

interface CachedHeadlines {
  headlines: string[];
  lastFetch: string;
  strategy: string;
  isRefreshing: boolean;
}

// Global cache instance (persists across requests in the same server process)
let headlineCache: CachedHeadlines | null = null;
let initPromise: Promise<void> | null = null;
let refreshInterval: NodeJS.Timeout | null = null;

// Default headlines for when cache is cold and fetch is in progress
const DEFAULT_HEADLINES: string[] = [
  '**AI News Loading** - Your personalized headlines are being prepared...',
];

/**
 * Check if we're in Eastern Daylight Time
 */
function isEasternDaylightTime(date: Date): boolean {
  const year = date.getFullYear();
  const march = new Date(year, 2, 1);
  const dstStart = new Date(year, 2, 14 - march.getDay());
  const november = new Date(year, 10, 1);
  const dstEnd = new Date(year, 10, 7 - november.getDay());
  return date >= dstStart && date < dstEnd;
}

/**
 * Check if headlines need to be refreshed (after 6am ET)
 */
function needsRefresh(): boolean {
  if (!headlineCache) return true;
  if (headlineCache.isRefreshing) return false;

  const now = new Date();
  const lastFetch = new Date(headlineCache.lastFetch);
  
  const todayAt6amET = new Date();
  const isEDT = isEasternDaylightTime(now);
  const utcOffset = isEDT ? 10 : 11;
  todayAt6amET.setUTCHours(utcOffset, 0, 0, 0);
  
  if (now < todayAt6amET) {
    todayAt6amET.setUTCDate(todayAt6amET.getUTCDate() - 1);
  }
  
  return lastFetch < todayAt6amET;
}

/**
 * Fetch fresh headlines and update cache
 */
async function fetchAndCacheHeadlines(): Promise<void> {
  if (headlineCache) {
    headlineCache.isRefreshing = true;
  }

  console.log('🔄 [Cache] Fetching fresh headlines...');
  
  try {
    const headlines = await fetchHeadlinesWithClaude();
    
    headlineCache = {
      headlines,
      lastFetch: new Date().toISOString(),
      strategy: 'claude-agent',
      isRefreshing: false,
    };
    
    console.log(`✅ [Cache] Headlines cached: ${headlines.length} items`);
    console.log(`📋 [Cache] First 3:`, headlines.slice(0, 3));
  } catch (error) {
    console.error('❌ [Cache] Failed to fetch headlines:', error);
    if (headlineCache) {
      headlineCache.isRefreshing = false;
    }
    throw error;
  }
}

/**
 * Initialize the cache on server startup
 * Called once when the module is first loaded
 */
export async function initializeCache(): Promise<void> {
  // If already initializing, wait for it
  if (initPromise) {
    return initPromise;
  }

  // If cache exists and is fresh, no need to initialize
  if (headlineCache && !needsRefresh()) {
    console.log('✅ [Cache] Already initialized with fresh headlines');
    return;
  }

  console.log('🚀 [Cache] Initializing headline cache...');
  
  initPromise = fetchAndCacheHeadlines().finally(() => {
    initPromise = null;
  });

  return initPromise;
}

/**
 * Get cached headlines immediately (non-blocking)
 * Returns cached data if available, or triggers background fetch
 */
export function getCachedHeadlines(): {
  headlines: string[];
  timestamp: string | null;
  cached: boolean;
  isLoading: boolean;
} {
  // If we have cached headlines, return them
  if (headlineCache && headlineCache.headlines.length > 0) {
    // Check if we need a background refresh
    if (needsRefresh() && !headlineCache.isRefreshing) {
      console.log('🔄 [Cache] Starting background refresh...');
      fetchAndCacheHeadlines().catch(err => {
        console.error('❌ [Cache] Background refresh failed:', err);
      });
    }
    
    return {
      headlines: headlineCache.headlines,
      timestamp: headlineCache.lastFetch,
      cached: true,
      isLoading: headlineCache.isRefreshing,
    };
  }

  // No cache - trigger initialization
  if (!initPromise) {
    console.log('🚀 [Cache] No cache, starting initialization...');
    initializeCache().catch(err => {
      console.error('❌ [Cache] Init failed:', err);
    });
  }

  return {
    headlines: DEFAULT_HEADLINES,
    timestamp: null,
    cached: false,
    isLoading: true,
  };
}

/**
 * Get cached headlines with waiting (blocking)
 * Waits for cache to be populated if empty
 */
export async function getHeadlinesWithWait(): Promise<{
  headlines: string[];
  timestamp: string;
  cached: boolean;
}> {
  // If no cache, wait for initialization
  if (!headlineCache) {
    await initializeCache();
  }
  
  // If still no cache after init (shouldn't happen), try again
  if (!headlineCache) {
    await fetchAndCacheHeadlines();
  }

  if (!headlineCache) {
    throw new Error('Failed to initialize headline cache');
  }

  return {
    headlines: headlineCache.headlines,
    timestamp: headlineCache.lastFetch,
    cached: true,
  };
}

/**
 * Force a cache refresh
 */
export async function forceRefresh(): Promise<void> {
  console.log('🔄 [Cache] Force refresh requested');
  await fetchAndCacheHeadlines();
}

/**
 * Start background refresh interval
 * Checks every hour if headlines need refreshing
 */
export function startBackgroundRefresh(): void {
  if (refreshInterval) {
    console.log('⚠️ [Cache] Background refresh already running');
    return;
  }

  console.log('🔄 [Cache] Starting hourly background refresh check');
  
  refreshInterval = setInterval(() => {
    console.log('⏰ [Cache] Hourly refresh check...');
    if (needsRefresh() && headlineCache && !headlineCache.isRefreshing) {
      console.log('🔄 [Cache] Headlines stale, refreshing...');
      fetchAndCacheHeadlines().catch(err => {
        console.error('❌ [Cache] Background refresh failed:', err);
      });
    } else {
      console.log('✅ [Cache] Headlines still fresh');
    }
  }, 60 * 60 * 1000); // Every hour
}

/**
 * Stop background refresh
 */
export function stopBackgroundRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('🛑 [Cache] Background refresh stopped');
  }
}

// PRE-WARM: Start initialization as soon as this module is imported
console.log('🚀 [Cache] Module loaded, pre-warming cache...');
initializeCache()
  .then(() => {
    console.log('✅ [Cache] Pre-warm complete');
    startBackgroundRefresh();
  })
  .catch(err => {
    console.error('❌ [Cache] Pre-warm failed:', err);
  });

