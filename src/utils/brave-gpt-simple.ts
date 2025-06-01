import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Validate required environment variables
if (!BRAVE_API_KEY) {
  throw new Error('BRAVE_API_KEY environment variable is required');
}
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
}

async function performSingleBraveSearch(): Promise<SearchResult[]> {
  console.log('🔍 Performing single Brave Search...');
  
  try {
    const query = 'AI artificial intelligence OpenAI ChatGPT Claude Anthropic latest news 2024';
    console.log(`🌐 Query: "${query}"`);
    console.log(`🔑 API Key: ${BRAVE_API_KEY.substring(0, 10)}...`);
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: query,
        count: 20,
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
    
    const webResults = response.data?.web?.results || [];
    console.log(`📰 Raw web results found: ${webResults.length}`);
    
    if (webResults.length === 0) {
      console.error('❌ No web results found in API response');
      console.error('🔍 Full response keys:', Object.keys(response.data));
      return [];
    }

    // Convert to our SearchResult format
    const searchResults: SearchResult[] = webResults.map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      description: result.description || '',
      page_age: result.page_age || undefined
    }));

    console.log(`✅ Processed ${searchResults.length} search results`);
    return searchResults;

  } catch (error) {
    console.error('❌ Brave Search API Error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : 'No message');
    
    if (axios.isAxiosError(error)) {
      console.error('🔍 Axios Error Details:');
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Request URL:', error.config?.url);
      console.error('  - Request method:', error.config?.method);
      console.error('  - Error code:', error.code);
    } else {
      console.error('🔍 Non-axios error details:', error);
    }
    return [];
  }
}

async function refineWithGPT(searchResults: SearchResult[]): Promise<string[]> {
  console.log('🤖 Refining with GPT-4o...');
  
  if (searchResults.length === 0) {
    console.error('❌ No search results to refine');
    return [];
  }

  const headlinesList = searchResults.map((result, index) => 
    `${index + 1}. **${result.title}** (${result.page_age ? new Date(result.page_age).toDateString() : 'Recent'})\n   URL: ${result.url}`
  ).join('\n\n');

  const prompt = `You are an AI news curator. Review these ${searchResults.length} AI news headlines and select the 15 BEST ones that focus on:

- AI product launches and feature releases (ChatGPT, Claude, Gemini, Copilot, etc.)
- AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, etc.)
- AI startup funding, acquisitions, partnerships
- New AI model releases or capability upgrades
- AI hardware/chip announcements

Return exactly 15 headlines in this format:
1. **Headline** (Date)
2. **Headline** (Date)
...etc

HEADLINES TO REVIEW:

${headlinesList}

Return only the numbered list of headlines with no additional text.`;

  try {
    console.log('🚀 Calling GPT-4o API...');
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ GPT-4o response received');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    console.log(`📝 Response length: ${content.length} characters`);
    
    const headlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log(`📰 Parsed ${headlines.length} headlines`);
    return headlines;

  } catch (error) {
    console.error('❌ GPT-4o Error:', error);
    return [];
  }
}

// Simplified main function
export async function fetchTechNewsHeadlines(): Promise<string[]> {
  console.log('🔌 fetchTechNewsHeadlines called (Simple Brave + GPT)');
  
  try {
    console.log('🚀 STEP 1: Single Brave Search...');
    const searchResults = await performSingleBraveSearch();
    
    console.log(`📊 STEP 1 RESULT: ${searchResults.length} search results`);
    
    if (searchResults.length === 0) {
      console.error('❌ CRITICAL: No search results found!');
      throw new Error('No search results found from Brave Search');
    }
    
    console.log('🚀 STEP 2: GPT refinement...');
    const headlines = await refineWithGPT(searchResults);
    
    console.log(`📊 STEP 2 RESULT: ${headlines.length} refined headlines`);
    console.log('🎉 Simple approach completed!');
    
    return headlines;

  } catch (error) {
    console.error('💥 ERROR in simple news fetching:', error);
    throw new Error('Failed to fetch news headlines');
  }
}

// Test function
async function testSimpleApproach() {
  try {
    const headlines = await fetchTechNewsHeadlines();
    console.log('\n📰 FINAL HEADLINES:');
    headlines.forEach((headline, index) => {
      console.log(`${index + 1}. ${headline}`);
    });
    return headlines;
  } catch (error) {
    console.error('Error testing simple approach:', error);
    throw error;
  }
}

// CLI entry point for direct testing
if (require.main === module) {
  testSimpleApproach()
    .then(() => console.log('\n✅ Test completed'))
    .catch(err => console.error('💥 Test failed:', err));
} 