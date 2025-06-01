import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';

// OpenAI API Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Validate required environment variables
if (!BRAVE_API_KEY) {
  throw new Error('BRAVE_API_KEY environment variable is required');
}
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Utility function to add delay for rate limiting
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Multiple targeted search queries based on original Perplexity prompt
const SEARCH_CATEGORIES = [
  {
    name: "AI Product Launches & API Updates",
    queries: [
      "ChatGPT Claude Gemini Copilot new features API updates latest 2024 2025",
      "OpenAI Anthropic Google AI product launch new release"
    ]
  },
  {
    name: "AI Company Announcements", 
    queries: [
      "OpenAI Anthropic Google Meta Microsoft AI announcement news",
      "Nvidia AMD AI company announcement latest"
    ]
  },
  {
    name: "AI Startup Funding & Acquisitions",
    queries: [
      "AI startup funding Series A venture capital latest",
      "artificial intelligence acquisition partnership executive hire"
    ]
  },
  {
    name: "AI Model Releases",
    queries: [
      "new AI model release GPT Claude Gemini upgrade",
      "artificial intelligence model capability upgrade latest"
    ]
  },
  {
    name: "AI Hardware & Chips",
    queries: [
      "Nvidia AMD Intel AI chip hardware announcement",
      "AI processor GPU hardware news latest"
    ]
  }
];

interface SearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
  search_category: string;
  search_query: string;
}

async function performBraveSearch(query: string, category: string): Promise<SearchResult[]> {
  console.log(`🔍 Brave Search: "${query}" (${category})`);
  
  try {
    console.log(`🌐 Making API request to: ${BRAVE_WEB_API_URL}`);
    console.log(`🔑 Using API key: ${BRAVE_API_KEY.substring(0, 10)}...`);
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: query,
        count: 10,
        country: 'us',
        search_lang: 'en',
        spellcheck: 1,
        freshness: 'pw' // past week
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    console.log(`📊 API Response Status: ${response.status}`);
    console.log(`📊 API Response Headers:`, response.headers);
    console.log(`📊 Raw API Response:`, JSON.stringify(response.data, null, 2));

    const results = response.data.web?.results || [];
    console.log(`✅ Found ${results.length} results for "${query}"`);
    
    if (results.length === 0) {
      console.log(`⚠️ No results found for query: "${query}"`);
      console.log(`📋 Full response data:`, response.data);
    }
    
    return results.map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
      page_age: result.page_age,
      search_category: category,
      search_query: query
    }));

  } catch (error) {
    console.error(`❌ Error searching "${query}":`, error);
    if (axios.isAxiosError(error)) {
      console.error(`📊 HTTP Status: ${error.response?.status}`);
      console.error(`📊 HTTP Response:`, error.response?.data);
      console.error(`📊 HTTP Headers:`, error.response?.headers);
    }
    return [];
  }
}

function filterAndDeduplicate(allResults: SearchResult[]): SearchResult[] {
  console.log('🧹 Filtering and deduplicating results...');
  
  // Filter out non-news sources
  const filtered = allResults.filter(result => {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();
    
    // Skip Wikipedia, forums, and other non-news sources
    const skipSources = ['wikipedia.org', 'reddit.com', 'stackoverflow.com', 'github.com'];
    const isNewsSource = !skipSources.some(source => url.includes(source));
    
    // Skip overly generic titles
    const isSpecific = !title.includes('how to') && !title.includes('tutorial');
    
    return isNewsSource && isSpecific;
  });

  // Remove duplicates based on URL
  const deduplicated = filtered.filter((result, index, self) => 
    index === self.findIndex(r => r.url === result.url)
  );

  // Sort by recency (newer first)
  deduplicated.sort((a, b) => {
    if (a.page_age && b.page_age) {
      return new Date(b.page_age).getTime() - new Date(a.page_age).getTime();
    }
    return 0;
  });

  console.log(`📊 Filtered: ${allResults.length} → ${filtered.length} → ${deduplicated.length} (after dedup)`);
  return deduplicated;
}

async function gatherBraveSearchResults(): Promise<SearchResult[]> {
  console.log('🚀 Starting Brave Search data gathering...');
  console.log(`📋 Will perform ${SEARCH_CATEGORIES.reduce((acc, cat) => acc + cat.queries.length, 0)} searches across ${SEARCH_CATEGORIES.length} categories`);
  
  let allResults: SearchResult[] = [];
  let searchCount = 0;
  let successfulSearches = 0;
  let failedSearches = 0;
  
  try {
    for (const category of SEARCH_CATEGORIES) {
      console.log(`\n📂 CATEGORY: ${category.name} (${category.queries.length} queries)`);
      
      for (const query of category.queries) {
        console.log(`\n🔍 Query ${searchCount + 1}/${SEARCH_CATEGORIES.reduce((acc, cat) => acc + cat.queries.length, 0)}: "${query}"`);
        
        // Respect rate limit: wait 2 seconds between searches
        if (searchCount > 0) {
          console.log('⏰ Waiting 2 seconds for rate limit...');
          await delay(2000);
        }
        
        const beforeCount = allResults.length;
        const results = await performBraveSearch(query, category.name);
        const afterCount = allResults.length + results.length;
        
        if (results.length > 0) {
          successfulSearches++;
          console.log(`✅ Query successful: Added ${results.length} results (total: ${beforeCount} → ${afterCount})`);
        } else {
          failedSearches++;
          console.log(`❌ Query failed: No results added (total remains: ${allResults.length})`);
        }
        
        allResults = allResults.concat(results);
        searchCount++;
      }
    }

    console.log(`\n📊 BRAVE SEARCH COMPLETE - Summary:`);
    console.log(`  - Total queries executed: ${searchCount}`);
    console.log(`  - Successful queries: ${successfulSearches}`);
    console.log(`  - Failed queries: ${failedSearches}`);
    console.log(`  - Total raw results: ${allResults.length}`);
    
    if (allResults.length === 0) {
      console.error('❌ CRITICAL: All Brave Search queries returned 0 results!');
      console.error('🔍 Debugging info:');
      console.error(`  - API Key: ${BRAVE_API_KEY.substring(0, 10)}...`);
      console.error(`  - API URL: ${BRAVE_WEB_API_URL}`);
      console.error(`  - Search categories: ${SEARCH_CATEGORIES.length}`);
      console.error(`  - Total queries: ${searchCount}`);
    }
    
    // Filter and deduplicate
    const finalResults = filterAndDeduplicate(allResults);
    
    console.log(`\n📊 API USAGE: Used ${searchCount} Brave Search queries`);
    return finalResults;

  } catch (error) {
    console.error('❌ Brave search failed:', error);
    throw error;
  }
}

async function refineHeadlinesWithGPT(searchResults: SearchResult[]): Promise<string[]> {
  console.log('\n🤖 Refining headlines with GPT-4o...');
  
  // Prepare headlines for GPT
  const headlinesList = searchResults.map((result, index) => 
    `${index + 1}. **${result.title}** (${result.page_age ? new Date(result.page_age).toDateString() : 'Recent'}) - ${result.search_category}\n   URL: ${result.url}`
  ).join('\n\n');

  // Use the same criteria from your original Perplexity prompt
  const refinementPrompt = `You are an expert AI news curator. I have gathered ${searchResults.length} potential AI news headlines from web search. Please review them and select the 20 BEST headlines that match these specific criteria:

FOCUS EXCLUSIVELY ON:
- AI product launches, feature releases, and API updates (ChatGPT, Claude, Gemini, Copilot, etc.)
- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.)  
- AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires
- AI-related venture capital deals, public market moves, or major contracts
- New AI model releases or significant capability upgrades
- Developer tool integrations and platform partnerships
- AI chip/hardware announcements from Nvidia, AMD, Intel, etc.

REQUIREMENTS:
- Include stories with specific dates within the past 2 weeks
- Each headline must represent a concrete, actionable development
- Prioritize official announcements over speculation or rumors
- Include funding amounts, version numbers, or other specific details when available
- Remove duplicate or very similar stories

FORMAT: Return exactly 20 headlines in this format:
1. **Headline** (Date)
2. **Headline** (Date)
...etc

HEADLINES TO REVIEW:

${headlinesList}

Return only the numbered list of 20 refined headlines with no additional text.`;

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: refinementPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ GPT-4o refinement complete');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    console.log('📝 GPT-4o response length:', content.length);
    
    // Parse the refined headlines
    const refinedHeadlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 Refined headlines count:', refinedHeadlines.length);
    console.log('📋 First few refined headlines:', refinedHeadlines.slice(0, 3));
    
    return refinedHeadlines;

  } catch (error) {
    console.error('❌ GPT-4o refinement failed:', error);
    throw new Error('Failed to refine headlines with GPT-4o');
  }
}

// Main function that combines Brave Search + GPT-4o refinement
export async function fetchTechNewsHeadlines(): Promise<string[]> {
  console.log('🔌 fetchTechNewsHeadlines called (Brave + GPT-4o)');
  
  try {
    console.log('🚀 STEP 1: Starting Brave Search data gathering...');
    
    // Step 1: Gather comprehensive results from Brave Search
    const searchResults = await gatherBraveSearchResults();
    
    console.log(`📊 STEP 1 COMPLETE: Received ${searchResults.length} search results`);
    
    if (searchResults.length === 0) {
      console.error('❌ CRITICAL ERROR: No search results found from Brave Search');
      console.error('🔍 This could be due to:');
      console.error('  - API key issues');
      console.error('  - Rate limiting');
      console.error('  - Network connectivity');
      console.error('  - Search query problems');
      throw new Error('No search results found from Brave Search');
    }
    
    console.log('🚀 STEP 2: Starting GPT-4o refinement...');
    
    // Step 2: Refine headlines using GPT-4o with original Perplexity criteria
    const refinedHeadlines = await refineHeadlinesWithGPT(searchResults);
    
    console.log(`📊 STEP 2 COMPLETE: Refined to ${refinedHeadlines.length} headlines`);
    console.log('\n🎉 Hybrid Brave + GPT-4o approach completed successfully!');
    console.log(`📊 FINAL RESULT: ${searchResults.length} raw results → ${refinedHeadlines.length} refined headlines`);
    
    return refinedHeadlines;

  } catch (error) {
    console.error('💥 ERROR in hybrid news fetching:', error);
    if (error instanceof Error) {
      console.error('💥 Error message:', error.message);
      console.error('💥 Error stack:', error.stack);
    }
    throw new Error('Failed to fetch and refine news headlines');
  }
}

// Test function
export async function testBraveGPTNewsApproach(): Promise<string[]> {
  try {
    const headlines = await fetchTechNewsHeadlines();
    console.log('\n📰 FINAL HEADLINES:');
    headlines.forEach((headline, index) => {
      console.log(`${index + 1}. ${headline}`);
    });
    return headlines;
  } catch (error) {
    console.error('Error testing Brave + GPT approach:', error);
    throw error;
  }
}

// CLI entry point for direct testing
if (require.main === module) {
  testBraveGPTNewsApproach()
    .then(() => console.log('\n✅ Test completed'))
    .catch(err => console.error('💥 Test failed:', err));
} 