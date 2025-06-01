const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_WEB_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Utility function to add delay for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Multiple targeted search queries based on original Perplexity prompt
const SEARCH_CATEGORIES = [
  {
    name: "AI Product Launches & API Updates",
    queries: [
      "ChatGPT Claude Gemini Copilot new features API updates latest 2024",
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

async function performSearch(query, category) {
  console.log(`🔍 Searching: "${query}" (${category})`);
  
  try {
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: query,
        count: 10, // Get more results per search
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

    const results = response.data.web?.results || [];
    console.log(`✅ Found ${results.length} results for "${query}"`);
    
    // Add category metadata to each result
    return results.map(result => ({
      ...result,
      search_category: category,
      search_query: query
    }));

  } catch (error) {
    console.error(`❌ Error searching "${query}":`, error.response?.data || error.message);
    return [];
  }
}

function filterAndDeduplicate(allResults) {
  console.log('\n🧹 Filtering and deduplicating results...');
  
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
      return new Date(b.page_age) - new Date(a.page_age);
    }
    return 0;
  });

  console.log(`📊 Filtered: ${allResults.length} → ${filtered.length} → ${deduplicated.length} (after dedup)`);
  return deduplicated;
}

function formatHeadlines(results) {
  console.log('\n📰 FORMATTED HEADLINES (Perplexity-style):');
  console.log('=' * 80);
  
  results.slice(0, 20).forEach((result, index) => {
    const publishedDate = result.page_age ? 
      new Date(result.page_age).toDateString() : 
      'Recent';
    
    console.log(`${index + 1}. **${result.title}** (${publishedDate})`);
    console.log(`   📂 Category: ${result.search_category}`);
    console.log(`   🔗 ${result.url}`);
    console.log('');
  });
  
  console.log('=' * 80);
}

async function comprehensiveAINewsSearch() {
  console.log('🚀 Starting Comprehensive AI News Search...');
  console.log(`📋 Will perform ${SEARCH_CATEGORIES.reduce((acc, cat) => acc + cat.queries.length, 0)} searches across ${SEARCH_CATEGORIES.length} categories`);
  
  let allResults = [];
  let searchCount = 0;
  
  try {
    for (const category of SEARCH_CATEGORIES) {
      console.log(`\n📂 CATEGORY: ${category.name}`);
      
      for (const query of category.queries) {
        // Respect rate limit: wait 2 seconds between searches
        if (searchCount > 0) {
          console.log('⏰ Waiting 2 seconds for rate limit...');
          await delay(2000);
        }
        
        const results = await performSearch(query, category.name);
        allResults = allResults.concat(results);
        searchCount++;
      }
    }

    console.log(`\n📊 SEARCH COMPLETE - Total raw results: ${allResults.length}`);
    
    // Filter, deduplicate, and format results
    const finalResults = filterAndDeduplicate(allResults);
    
    // Show category breakdown
    console.log('\n📊 RESULTS BY CATEGORY:');
    SEARCH_CATEGORIES.forEach(category => {
      const categoryResults = finalResults.filter(r => r.search_category === category.name);
      console.log(`- ${category.name}: ${categoryResults.length} results`);
    });
    
    // Format as headlines
    formatHeadlines(finalResults);
    
    // Show API usage
    console.log(`\n📊 API USAGE: Used ${searchCount} queries (Rate limit: 1/second, 2000/month)`);
    
    return finalResults;

  } catch (error) {
    console.error('❌ Comprehensive search failed:', error);
    throw error;
  }
}

// Run the comprehensive search
if (require.main === module) {
  comprehensiveAINewsSearch()
    .then(results => {
      console.log('\n🎉 Comprehensive AI News Search completed successfully!');
      console.log(`📊 Final result count: ${results.length}`);
      console.log('✨ This should much better match your original Perplexity prompt requirements!');
    })
    .catch(error => {
      console.error('\n💥 Search failed:', error.message);
    });
}

module.exports = { comprehensiveAINewsSearch }; 