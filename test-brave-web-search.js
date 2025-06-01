const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_WEB_API_URL = 'https://api.search.brave.com/res/v1/web/search';

async function testBraveWebSearch() {
  console.log('🔌 Testing Brave Web Search API...');
  
  try {
    // Test with a simple AI news search
    console.log('\n🌐 Searching the web for AI news...');
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: 'AI news ChatGPT OpenAI latest 2024',
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
    
    console.log('✅ Web search successful!');
    console.log('📊 Results found:', response.data.web?.results?.length || 0);
    
    if (response.data.web?.results?.length > 0) {
      console.log('\n🔍 Web Search Results:');
      response.data.web.results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Description: ${result.description?.substring(0, 150)}...`);
        console.log('');
      });
    }

    // Check if there are news results in the web response
    if (response.data.news?.results?.length > 0) {
      console.log('\n📰 News Results found in Web Search:');
      response.data.news.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Published: ${result.published || 'Unknown'}`);
        console.log(`   URL: ${result.url}`);
        console.log('');
      });
    }

    // Show what data structure we get back
    console.log('\n📋 Available data types in response:');
    Object.keys(response.data).forEach(key => {
      console.log(`- ${key}: ${response.data[key]?.results?.length || 0} results`);
    });

    // Show API usage info
    console.log('\n📊 API Usage Information:');
    console.log('Rate Limit:', response.headers['x-ratelimit-limit'] || 'Not provided');
    console.log('Rate Remaining:', response.headers['x-ratelimit-remaining'] || 'Not provided');

    return response.data;

  } catch (error) {
    console.error('❌ Error testing Brave Web Search API:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('🔑 API Key issue - please check your Brave Search API key');
      console.error('💡 Make sure you have signed up at: https://api-dashboard.search.brave.com/');
    }
    
    if (error.response?.status === 429) {
      console.error('⏰ Rate limit exceeded');
      console.error('📝 Free plan limits: 1 query/second, 2,000 queries/month');
    }
    
    if (error.response?.data) {
      console.error('📋 Full error details:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBraveWebSearch()
    .then(data => {
      console.log('\n🎉 Brave Web Search API test completed!');
      console.log('✨ The API is working! This could be a great Perplexity alternative.');
      
      // Count total results across all result types
      let totalResults = 0;
      Object.keys(data).forEach(key => {
        if (data[key]?.results?.length) {
          totalResults += data[key].results.length;
        }
      });
      console.log(`📊 Total results across all types: ${totalResults}`);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
    });
}

module.exports = { testBraveWebSearch }; 