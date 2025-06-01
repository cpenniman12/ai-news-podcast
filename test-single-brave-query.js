const axios = require('axios');

const BRAVE_API_KEY = 'BSAy9Eebad3LRayxd8Eb2s5TN_Xgy7z';
const BRAVE_WEB_API_URL = 'https://api.search.brave.com/res/v1/web/search';

async function testSingleQuery() {
  console.log('🔌 Testing single Brave Search query...');
  
  try {
    const query = 'ChatGPT Claude Gemini Copilot new features API updates latest 2024';
    console.log(`🔍 Query: "${query}"`);
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: query,
        count: 5,
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

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response size: ${JSON.stringify(response.data).length} characters`);
    
    const webResults = response.data?.web?.results || [];
    console.log(`📰 Web results found: ${webResults.length}`);
    
    if (webResults.length > 0) {
      console.log('✅ SUCCESS - Results found!');
      webResults.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i+1}. ${result.title}`);
      });
    } else {
      console.log('❌ FAILURE - No results found');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSingleQuery(); 