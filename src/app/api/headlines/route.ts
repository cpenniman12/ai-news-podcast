import { NextResponse } from 'next/server';
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

async function performBraveSearch(): Promise<SearchResult[]> {
  console.log('🔍 [API] Performing Multiple Brave Searches...');
  
  try {
    // Multiple targeted queries for diverse results
    const queries = [
      "OpenAI Anthropic Google Meta AI announcement May 2025",
      "AI startup funding Series A venture capital 2025", 
      "new AI model release GPT Claude Gemini 2025",
      "Nvidia AMD AI chip earnings announcement 2025",
      "AI company acquisition partnership deal 2025"
    ];
    
    let allSearchResults: any[] = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`🌐 [API] Query ${i+1}/5: "${query}"`);
      
      const response = await axios.get(BRAVE_WEB_API_URL, {
        params: {
          q: query,
          count: 15, // Smaller count per query
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

      console.log(`✅ [API] Query ${i+1} Status: ${response.status}`);
      
      const webResults = response.data?.web?.results || [];
      console.log(`📰 [API] Query ${i+1} Results: ${webResults.length}`);
      
      // Add to our collection
      allSearchResults.push(...webResults);
      
      // Wait 1.5 seconds between requests to respect rate limit (except for last request)
      if (i < queries.length - 1) {
        console.log(`⏳ [API] Waiting 1.5 seconds before next query...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`📊 [API] Total raw results collected: ${allSearchResults.length}`);
    
    // Remove duplicates based on URL
    const uniqueResults = allSearchResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );
    
    console.log(`📰 [API] Unique results after deduplication: ${uniqueResults.length}`);
    
    if (uniqueResults.length === 0) {
      console.error('❌ [API] No search results found');
      return [];
    }

    // Convert to our SearchResult format
    const searchResults: SearchResult[] = uniqueResults.map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      description: result.description || '',
      page_age: result.page_age || undefined
    }));

    console.log(`✅ [API] Processed ${searchResults.length} unique search results`);
    return searchResults;

  } catch (error) {
    console.error('❌ [API] Brave Search Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('🔍 [API] Axios Error Details:');
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - Request URL:', error.config?.url);
      console.error('  - Error code:', error.code);
    }
    return [];
  }
}

async function refineWithGPT(searchResults: SearchResult[]): Promise<string[]> {
  console.log('🤖 [API] Refining with GPT-4o...');
  
  if (searchResults.length === 0) {
    console.error('❌ [API] No search results to refine');
    return [];
  }

  const headlinesList = searchResults.map((result, index) => 
    `${index + 1}. **${result.title}** (${result.page_age ? new Date(result.page_age).toDateString() : 'Recent'})`
  ).join('\n\n');

  console.log(`📝 [API] Headlines list for GPT (${headlinesList.length} chars):`);
  console.log(headlinesList.substring(0, 500) + '...');

  const prompt = `You will be provided with these AI and technology news headlines from the past 2 weeks. Your task is to identify and return 12-18 headlines that match the specified criteria. 

Selection criteria - INCLUDE headlines about:
- AI product launches, feature releases, and API updates (ChatGPT, Claude, Gemini, Copilot, etc.)
- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.)
- AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires
- AI-related venture capital deals, public market moves, or major contracts
- New AI model releases or significant capability upgrades
- Developer tool integrations and platform partnerships
- AI chip/hardware announcements from Nvidia, AMD, Intel, etc.
- AI safety and governance developments from major organizations
- Major AI research breakthroughs with commercial implications

EXCLUDE headlines about:
- Academic research studies without clear commercial impact
- General "AI adoption" trend surveys
- Conference announcements (unless major product launches)
- Pure opinion pieces without news content
- Government policy discussions (unless affecting major companies)

Instructions:
- Err on the side of inclusion rather than exclusion
- Include any story that represents a meaningful development in the AI industry
- Return 12-18 headlines as a numbered list
- Maintain original headline formatting and source attribution

Output format: Numbered list of selected headlines only, no additional text or explanations.

HEADLINES TO REVIEW:

${headlinesList}`;

  try {
    console.log('🚀 [API] Calling GPT-4o API...');
    
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
    
    console.log('✅ [API] GPT-4o response received');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    console.log(`📝 [API] GPT Response length: ${content.length} characters`);
    console.log(`📄 [API] Raw GPT Response:\n${content}`);
    
    const headlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log(`📰 [API] Parsed ${headlines.length} headlines from GPT response`);
    console.log(`📋 [API] First 3 parsed headlines:`, headlines.slice(0, 3));
    
    return headlines;

  } catch (error) {
    console.error('❌ [API] GPT-4o Error:', error);
    return [];
  }
}

export async function GET() {
  console.log('🔌 [API] Headlines API route called');
  
  try {
    console.log('🚀 [API] STEP 1: Brave Search...');
    const searchResults = await performBraveSearch();
    
    console.log(`📊 [API] STEP 1 RESULT: ${searchResults.length} search results`);
    
    if (searchResults.length === 0) {
      console.error('❌ [API] CRITICAL: No search results found!');
      return NextResponse.json(
        { error: 'No search results found from Brave Search' },
        { status: 500 }
      );
    }
    
    console.log('🚀 [API] STEP 2: GPT refinement...');
    const headlines = await refineWithGPT(searchResults);
    
    console.log(`📊 [API] STEP 2 RESULT: ${headlines.length} refined headlines`);
    console.log('🎉 [API] Server-side approach completed!');
    
    return NextResponse.json({ headlines });

  } catch (error) {
    console.error('💥 [API] ERROR in server-side news fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news headlines' },
      { status: 500 }
    );
  }
} 