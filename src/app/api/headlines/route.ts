import { NextResponse } from 'next/server';
import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_API_URL = process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
}

// Utility function to add delay for rate limiting
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Single Brave search with error handling
async function performSingleBraveSearch(): Promise<SearchResult[]> {
  try {
    console.log('🔍 [API] Performing SINGLE Brave Search (rate-limit friendly)...');
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: 'AI news 2025 OpenAI Anthropic Meta Google Nvidia artificial intelligence latest',
        count: 20, // Get more results in single query
        offset: 0,
        safesearch: 'moderate',
        search_lang: 'en',
        country: 'US',
        freshness: 'pw', // Past week
      },
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ [API] Single Brave Search Status:', response.status);
    
    const results = response.data?.web?.results || [];
    console.log('📰 [API] Single Brave Search Results:', results.length);
    
    return results.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      description: item.description || '',
      page_age: item.age || ''
    }));
    
  } catch (error: any) {
    console.error('❌ [API] Single Brave Search Error:', error.message);
    
    if (error.response?.data) {
      console.log('🔍 [API] Error Details:', {
        status: error.response.status,
        data: error.response.data,
        plan: error.response.data?.error?.meta?.plan,
        rate_limit: error.response.data?.error?.meta?.rate_limit,
        rate_current: error.response.data?.error?.meta?.rate_current,
      });
    }
    
    throw error;
  }
}

// Perplexity fallback for when Brave fails
async function performPerplexityFallback(): Promise<string[]> {
  try {
    console.log('🚀 [API] Using Perplexity fallback for headlines...');
    
    const prompt = `List 20 recent AI and technology news headlines from the past week. 

Focus on:
- AI product launches and major feature releases (ChatGPT, Claude, Gemini, etc.)
- AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia)
- AI startup funding rounds, acquisitions, and partnerships
- New AI model releases and capability upgrades
- AI hardware and chip announcements

Format: **Headline** (Date)
Return only the numbered list, no other text.`;

    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${PPLX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    console.log('✅ [API] Perplexity fallback successful');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    const headlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 [API] Perplexity headlines:', headlines.length);
    return headlines;
    
  } catch (error: any) {
    console.error('❌ [API] Perplexity fallback failed:', error.message);
    throw new Error('Both Brave and Perplexity failed');
  }
}

// GPT refinement of search results
async function refineWithGPT(searchResults: SearchResult[]): Promise<string[]> {
  try {
    console.log('🤖 [API] Refining search results with GPT-4o...');
    
    const headlines = searchResults.map((result, index) => 
      `${index + 1}. **${result.title}** ${result.description ? `- ${result.description}` : ''} (${result.url})`
    ).join('\n');
    
    const prompt = `Extract and format 15-20 AI and technology news headlines from these search results. Focus on recent, concrete developments.

Search Results:
${headlines}

Requirements:
- Only include AI-related news (products, companies, funding, models, hardware)
- Format: **Headline** (Date if available)  
- Prioritize recent and significant developments
- Remove duplicate or similar stories
- Return ONLY the numbered list, no explanations

Headlines:`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    console.log('✅ [API] GPT-4o refinement successful');
    
    const content = response.data.choices?.[0]?.message?.content || '';
    const refinedHeadlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 [API] Refined headlines:', refinedHeadlines.length);
    return refinedHeadlines;
    
  } catch (error: any) {
    console.error('❌ [API] GPT refinement failed:', error.message);
    // Return raw titles as fallback
    return searchResults.map(result => result.title).filter(Boolean);
  }
}

export async function GET() {
  console.log('🔌 [API] Headlines API route called');
  
  // Validate required environment variables at runtime
  if (!BRAVE_API_KEY) {
    console.error('❌ [API] BRAVE_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'BRAVE_API_KEY not configured' },
      { status: 500 }
    );
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ [API] OPENAI_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    let headlines: string[] = [];
    
    // Strategy 1: Try single Brave search first
    try {
      console.log('🚀 [API] STRATEGY 1: Single Brave Search...');
      const searchResults = await performSingleBraveSearch();
      
      if (searchResults.length > 0) {
        headlines = await refineWithGPT(searchResults);
        console.log('✅ [API] Strategy 1 successful! Headlines:', headlines.length);
      } else {
        throw new Error('No search results from Brave');
      }
      
    } catch (braveError: any) {
      console.log('⚠️ [API] Strategy 1 failed, trying Strategy 2...');
      
      // Strategy 2: Use Perplexity fallback
      if (PPLX_API_KEY) {
        try {
          console.log('🚀 [API] STRATEGY 2: Perplexity Fallback...');
          headlines = await performPerplexityFallback();
          console.log('✅ [API] Strategy 2 successful! Headlines:', headlines.length);
        } catch (pplxError: any) {
          console.error('❌ [API] Strategy 2 also failed');
          throw new Error('All headline strategies failed');
        }
      } else {
        console.error('❌ [API] No Perplexity API key for fallback');
        throw braveError;
      }
    }
    
    // Ensure we have results
    if (!headlines || headlines.length === 0) {
      throw new Error('No headlines generated from any strategy');
    }
    
    console.log('🎉 [API] Final result:', headlines.length, 'headlines');
    console.log('📋 [API] Sample headlines:', headlines.slice(0, 3));
    
    return NextResponse.json({ 
      headlines,
      strategy: headlines.length > 15 ? 'brave_search' : 'perplexity_fallback',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [API] Complete failure:', error.message);
    return NextResponse.json(
      { 
        error: 'Failed to fetch headlines',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 