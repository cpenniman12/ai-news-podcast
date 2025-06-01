const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_WEB_API_URL = 'https://api.search.brave.com/res/v1/web/search';

async function testBraveWebSearchFull() {
  console.log('🔌 Testing Brave Web Search API - Full Response...');
  
  try {
    // Test with a simple AI news search
    console.log('\n🌐 Searching the web for AI news...');
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: 'AI news ChatGPT OpenAI latest 2024',
        count: 5, // Smaller count for readability
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
    console.log('📊 HTTP Status:', response.status);
    
    console.log('\n📋 COMPLETE API RESPONSE:');
    console.log('=' * 80);
    console.log(JSON.stringify(response.data, null, 2));
    console.log('=' * 80);
    
    console.log('\n📊 RESPONSE HEADERS:');
    console.log('Rate Limit:', response.headers['x-ratelimit-limit'] || 'Not provided');
    console.log('Rate Remaining:', response.headers['x-ratelimit-remaining'] || 'Not provided');
    console.log('Content-Type:', response.headers['content-type'] || 'Not provided');
    
    return response.data;

  } catch (error) {
    console.error('❌ Error testing Brave Web Search API:');
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('HTTP Status Text:', error.response.statusText);
      console.error('Response Headers:', error.response.headers);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBraveWebSearchFull()
    .then(data => {
      console.log('\n🎉 Raw API response printed above!');
      console.log('📝 You can now see the exact structure and content returned by Brave Search API');
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
    });
}

module.exports = { testBraveWebSearchFull }; 