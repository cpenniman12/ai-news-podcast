const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_NEWS_API_URL = 'https://api.search.brave.com/res/v1/news/search';

// Original prompt from Perplexity script
const AI_NEWS_PROMPT = `AI product launches, feature releases, and API updates (ChatGPT, Claude, Gemini, Copilot, etc.) OR AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.) OR AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires OR AI-related venture capital deals, public market moves, or major contracts OR New AI model releases or significant capability upgrades OR Developer tool integrations and platform partnerships OR AI chip/hardware announcements from Nvidia, AMD, Intel, etc.`;

async function testBraveSearchNews() {
  console.log('🔌 Testing Brave Search News API...');
  
  try {
    // Test 1: Basic AI news search
    console.log('\n📰 Test 1: Searching for AI news with basic query...');
    const basicResponse = await axios.get(BRAVE_NEWS_API_URL, {
      params: {
        q: 'AI artificial intelligence news latest',
        count: 10,
        country: 'us',
        search_lang: 'en',
        spellcheck: 1,
        // Add time filter for recent news
        freshness: 'pw' // past week
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });
    
    console.log('✅ Basic search successful!');
    console.log('📊 Results found:', basicResponse.data.news?.results?.length || 0);
    
    if (basicResponse.data.news?.results?.length > 0) {
      console.log('\n🔍 First 3 news results:');
      basicResponse.data.news.results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Published: ${result.published || 'Unknown'}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Description: ${result.description?.substring(0, 100)}...`);
        console.log('');
      });
    }

    // Test 2: More specific AI topics search
    console.log('\n📰 Test 2: Searching for specific AI topics...');
    const specificResponse = await axios.get(BRAVE_NEWS_API_URL, {
      params: {
        q: 'OpenAI ChatGPT Claude Anthropic Google Gemini AI model release',
        count: 15,
        country: 'us',
        search_lang: 'en',
        spellcheck: 1,
        freshness: 'pw'
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    console.log('✅ Specific search successful!');
    console.log('📊 Results found:', specificResponse.data.news?.results?.length || 0);
    
    if (specificResponse.data.news?.results?.length > 0) {
      console.log('\n🔍 AI-specific news results:');
      specificResponse.data.news.results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Published: ${result.published || 'Unknown'}`);
        console.log(`   Source: ${result.source || 'Unknown source'}`);
        console.log('');
      });
    }

    // Test 3: Funding and acquisitions search
    console.log('\n📰 Test 3: Searching for AI funding and acquisitions...');
    const fundingResponse = await axios.get(BRAVE_NEWS_API_URL, {
      params: {
        q: 'AI startup funding Series A venture capital acquisition',
        count: 10,
        country: 'us',
        search_lang: 'en',
        spellcheck: 1,
        freshness: 'pw'
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    console.log('✅ Funding search successful!');
    console.log('📊 Results found:', fundingResponse.data.news?.results?.length || 0);
    
    // Combine and format results
    const allResults = [
      ...(basicResponse.data.news?.results || []),
      ...(specificResponse.data.news?.results || []),
      ...(fundingResponse.data.news?.results || [])
    ];

    // Remove duplicates based on URL
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    console.log('\n📋 SUMMARY:');
    console.log(`🔢 Total unique results found: ${uniqueResults.length}`);
    console.log(`📅 Search performed: ${new Date().toISOString()}`);
    
    // Format results as headlines like Perplexity would
    console.log('\n📰 Formatted Headlines (Perplexity-style):');
    uniqueResults.slice(0, 20).forEach((result, index) => {
      const publishedDate = result.published ? new Date(result.published).toDateString() : 'Recent';
      console.log(`${index + 1}. **${result.title}** (${publishedDate})`);
    });

    return uniqueResults;

  } catch (error) {
    console.error('❌ Error testing Brave Search API:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('🔑 API Key issue - please check your Brave Search API key');
    }
    if (error.response?.status === 429) {
      console.error('⏰ Rate limit exceeded - too many requests');
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBraveSearchNews()
    .then(results => {
      console.log('\n🎉 Brave Search API test completed successfully!');
      console.log(`📊 Final result count: ${results.length}`);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testBraveSearchNews }; 