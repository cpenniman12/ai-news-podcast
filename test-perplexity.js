const { fetchTechNewsHeadlines } = require('./src/utils/perplexity.ts');

async function testPerplexity() {
  console.log('=== TESTING PERPLEXITY API ===');
  try {
    const headlines = await fetchTechNewsHeadlines();
    console.log('=== PARSED HEADLINES ===');
    console.log(headlines);
  } catch (error) {
    console.error('Error:', error);
  }
}

testPerplexity(); 