import { promises as fs } from 'fs';
import path from 'path';

export interface HeadlinesCache {
  headlines: string[];
  lastFetch: string;
  strategy: string;
}

// Fallback headlines if cache is empty or fails
export const FALLBACK_HEADLINES = [
  "**OpenAI announces GPT-5 with breakthrough reasoning capabilities** (January 10, 2026)",
  "**Anthropic releases Claude Opus 4.5 with extended context window** (January 9, 2026)",
  "**Google DeepMind unveils Gemini Pro 2.0 for developers** (January 8, 2026)",
  "**Meta AI launches new open-source Llama 4 model family** (January 7, 2026)",
  "**Microsoft integrates advanced AI copilots across Office 365** (January 6, 2026)",
  "**NVIDIA announces next-gen AI chips with 50% better performance** (January 5, 2026)",
  "**Perplexity AI raises $500M Series D at $9B valuation** (January 4, 2026)",
  "**Amazon Bedrock adds support for custom model fine-tuning** (January 3, 2026)",
  "**Anthropic partners with enterprise security platform Vanta** (January 2, 2026)",
  "**Character.AI reaches 100M monthly active users** (January 1, 2026)",
  "**Stability AI releases Stable Diffusion 4.0 with video generation** (December 31, 2025)",
  "**Cohere launches enterprise RAG platform for knowledge workers** (December 30, 2025)",
  "**Hugging Face surpasses 500,000 models on platform** (December 29, 2025)",
  "**Inflection AI debuts new personal AI assistant Pi 2.0** (December 28, 2025)",
  "**Adobe Firefly adds AI-powered video editing features** (December 27, 2025)",
  "**Databricks acquires MosaicML for $1.3B to expand AI capabilities** (December 26, 2025)",
  "**Runway ML launches Gen-3 video model with improved consistency** (December 25, 2025)",
  "**Scale AI valued at $14B in latest funding round** (December 24, 2025)",
  "**Midjourney releases version 7 with enhanced photorealism** (December 23, 2025)",
  "**Together AI raises $106M to democratize open-source AI** (December 22, 2025)"
];

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'headlines.json');

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('❌ [Cache] Failed to create cache directory:', error);
  }
}

/**
 * Read headlines from cache file
 */
export async function readHeadlinesCache(): Promise<HeadlinesCache | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    const cache: HeadlinesCache = JSON.parse(data);
    console.log('✅ [Cache] Successfully read from file cache');
    return cache;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('❌ [Cache] Error reading cache file:', error);
    }
    return null;
  }
}

/**
 * Write headlines to cache file
 */
export async function writeHeadlinesCache(cache: HeadlinesCache): Promise<void> {
  try {
    await ensureCacheDir();
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log('✅ [Cache] Successfully wrote to file cache');
  } catch (error) {
    console.error('❌ [Cache] Error writing cache file:', error);
    throw error;
  }
}

/**
 * Check if cache needs refresh (after 6am ET each day)
 */
export function needsRefresh(cache: HeadlinesCache | null): boolean {
  if (!cache) {
    console.log('📰 [Cache] No cache found, need to fetch headlines');
    return true;
  }

  const now = new Date();
  const lastFetch = new Date(cache.lastFetch);

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

  console.log('🕐 [Cache] Refresh check:', {
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

/**
 * Helper function to determine if we're in Eastern Daylight Time
 */
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

/**
 * Get headlines with fallback
 * Returns cached headlines if available, fallback headlines otherwise
 */
export async function getHeadlinesWithFallback(): Promise<{
  headlines: string[];
  strategy: string;
  timestamp: string;
  cached: boolean;
}> {
  const cache = await readHeadlinesCache();

  if (cache) {
    return {
      headlines: cache.headlines,
      strategy: cache.strategy,
      timestamp: cache.lastFetch,
      cached: true
    };
  }

  console.log('⚠️ [Cache] No cache available, using fallback headlines');
  return {
    headlines: FALLBACK_HEADLINES,
    strategy: 'fallback',
    timestamp: new Date().toISOString(),
    cached: false
  };
}
