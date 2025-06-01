const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_NEWS_API_URL = 'https://api.search.brave.com/res/v1/news/search';

// Utility function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testBraveSearchSimple() {
  console.log('🔌 Testing Brave Search News API (rate-limited version)...');
  
  try {
    // Single search for AI news (respecting rate limits)
    console.log('\n📰 Searching for recent AI news...');
    
    const response = await axios.get(BRAVE_NEWS_API_URL, {
      params: {
        q: 'AI artificial intelligence OpenAI ChatGPT Claude Anthropic news',
        count: 20, // Get more results in single request
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
    
    console.log('✅ Search successful!');
    console.log('📊 Results found:', response.data.news?.results?.length || 0);
    
    if (response.data.news?.results?.length > 0) {
      console.log('\n🔍 AI News Results:');
      response.data.news.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Published: ${result.published || 'Unknown'}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Description: ${result.description?.substring(0, 150)}...`);
        console.log('');
      });
      
      // Format as headlines like Perplexity
      console.log('\n📰 Formatted Headlines (Perplexity-style):');
      response.data.news.results.forEach((result, index) => {
        const publishedDate = result.published ? new Date(result.published).toDateString() : 'Recent';
        console.log(`${index + 1}. **${result.title}** (${publishedDate})`);
      });
    } else {
      console.log('⚠️ No news results found. Let me try a broader search...');
      
      // Wait 2 seconds to respect rate limit
      console.log('⏰ Waiting 2 seconds for rate limit...');
      await delay(2000);
      
      // Try broader search
      const broadResponse = await axios.get(BRAVE_NEWS_API_URL, {
        params: {
          q: 'artificial intelligence news',
          count: 15,
          country: 'us',
          search_lang: 'en',
          freshness: 'pm' // past month
        },
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      });
      
      console.log('✅ Broader search successful!');
      console.log('📊 Results found:', broadResponse.data.news?.results?.length || 0);
      
      if (broadResponse.data.news?.results?.length > 0) {
        console.log('\n📰 Broader AI News Headlines:');
        broadResponse.data.news.results.slice(0, 10).forEach((result, index) => {
          const publishedDate = result.published ? new Date(result.published).toDateString() : 'Recent';
          console.log(`${index + 1}. **${result.title}** (${publishedDate})`);
        });
      }
    }

    // Show API usage info if available
    if (response.headers) {
      console.log('\n📊 API Usage Information:');
      console.log('Rate Limit:', response.headers['x-ratelimit-limit'] || 'Unknown');
      console.log('Rate Remaining:', response.headers['x-ratelimit-remaining'] || 'Unknown');
      console.log('Quota Limit:', response.headers['x-quota-limit'] || 'Unknown');
      console.log('Quota Remaining:', response.headers['x-quota-remaining'] || 'Unknown');
    }

    return response.data.news?.results || [];

  } catch (error) {
    console.error('❌ Error testing Brave Search API:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('🔑 API Key issue - please check your Brave Search API key');
      console.error('💡 Make sure you have signed up at: https://api-dashboard.search.brave.com/');
    }
    
    if (error.response?.status === 429) {
      console.error('⏰ Rate limit exceeded');
      console.error('📝 Free plan limits: 1 query/second, 2,000 queries/month');
      console.error('💡 Consider upgrading plan or waiting between requests');
    }
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBraveSearchSimple()
    .then(results => {
      console.log('\n🎉 Brave Search API test completed!');
      console.log(`📊 Total results: ${results.length}`);
      console.log('✨ This could be a great alternative to Perplexity!');
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
    });
}

module.exports = { testBraveSearchSimple }; 