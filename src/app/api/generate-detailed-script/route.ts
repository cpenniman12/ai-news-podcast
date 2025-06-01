import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
}

interface SelectedHeadline {
  text: string;
}

// Extract the key search terms from a headline for better search accuracy
function extractSearchTerms(headline: string): string {
  // Remove common formatting like **bold** and dates in parentheses
  const cleanHeadline = headline
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\([^)]*\)/g, '') // Remove content in parentheses (usually dates/sources)
    .trim();
  
  // For AI news, focus on the main companies/products mentioned
  const aiTerms = ['AI', 'ChatGPT', 'GPT', 'Claude', 'Gemini', 'Copilot', 'OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft', 'Nvidia', 'AMD'];
  const foundTerms = aiTerms.filter(term => cleanHeadline.toLowerCase().includes(term.toLowerCase()));
  
  // If we found AI-specific terms, prioritize those, otherwise use the cleaned headline
  if (foundTerms.length > 0) {
    return `${foundTerms.join(' ')} ${cleanHeadline}`.slice(0, 100);
  }
  
  return cleanHeadline.slice(0, 100);
}

// Research a specific headline using Brave Search
async function researchHeadline(headline: string): Promise<SearchResult[]> {
  console.log(`🔍 [RESEARCH] Researching headline: ${headline.slice(0, 80)}...`);
  
  try {
    const searchTerms = extractSearchTerms(headline);
    console.log(`🎯 [RESEARCH] Search terms: ${searchTerms}`);
    
    const response = await axios.get(BRAVE_WEB_API_URL, {
      params: {
        q: searchTerms,
        count: 8, // Get more detailed results for each story
        country: 'us',
        search_lang: 'en',
        spellcheck: 1,
        freshness: 'pw' // past week to get recent content
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    console.log(`✅ [RESEARCH] Search response status: ${response.status}`);
    
    const webResults = response.data?.web?.results || [];
    console.log(`📊 [RESEARCH] Found ${webResults.length} results for headline research`);
    
    // Convert to our SearchResult format
    const searchResults: SearchResult[] = webResults.map((result: any) => ({
      title: result.title || 'No title',
      url: result.url || '',
      description: result.description || '',
      page_age: result.page_age || undefined
    }));

    return searchResults;

  } catch (error) {
    console.error(`❌ [RESEARCH] Error researching headline:`, error);
    if (axios.isAxiosError(error)) {
      console.error('🔍 [RESEARCH] Axios Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    return [];
  }
}

// Generate a detailed podcast script for a single story using researched content
async function generateStoryScript(headline: string, researchResults: SearchResult[]): Promise<string> {
  console.log(`✍️ [SCRIPT] Generating script for: ${headline.slice(0, 80)}...`);
  
  if (researchResults.length === 0) {
    console.log(`⚠️ [SCRIPT] No research results for headline, using headline only`);
  }

  // Prepare research content for the prompt
  const researchContent = researchResults.slice(0, 5).map((result, index) => 
    `Source ${index + 1}: ${result.title}\n${result.description}\n---`
  ).join('\n\n');

  const prompt = `You are an expert podcast host creating a detailed, engaging segment about this AI/tech news story. 

**Headline:** ${headline}

**Research Information:**
${researchContent || 'Limited research data available - focus on the headline information.'}

**Instructions:**
- Write a conversational 2-3 minute podcast segment (approximately 300-450 words)
- Start with a brief, engaging hook about why this story matters
- Explain the key details: who, what, when, where, why
- Include specific numbers, funding amounts, or technical details when available
- Explain the broader implications for the AI/tech industry
- Use a warm, conversational tone as if speaking directly to listeners
- End with a smooth transition phrase that leads into the next story
- DO NOT mention sources directly or say "according to reports"
- Speak as if you have expert knowledge of the topic

**Format:** Write only the spoken script text, no stage directions or metadata.

**Example tone:** "Here's something that caught my attention this week - [story details]. What makes this particularly interesting is [analysis]. For anyone following the AI space, this signals [implications]..."

Script:`;

  try {
    console.log(`🚀 [SCRIPT] Calling GPT-4o for script generation...`);
    
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`✅ [SCRIPT] GPT-4o script generation completed`);
    
    const script = response.data.choices?.[0]?.message?.content?.trim() || '';
    console.log(`📝 [SCRIPT] Generated script length: ${script.length} characters`);
    
    return script;

  } catch (error) {
    console.error(`❌ [SCRIPT] Error generating script:`, error);
    if (axios.isAxiosError(error)) {
      console.error('🔍 [SCRIPT] Axios Error Details:', {
        status: error.response?.status,
        data: error.response?.data
      });
    }
    return `I'm sorry, but I encountered an issue generating the detailed script for this story: ${headline}. Let me move on to the next story.`;
  }
}

export async function POST(req: NextRequest) {
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

  console.log('🎙️ [API] Detailed script generation API called');
  
  try {
    const { headlines } = await req.json();
    
    if (!Array.isArray(headlines) || headlines.length === 0) {
      console.log('❌ [API] No headlines provided');
      return NextResponse.json({ error: 'No headlines provided' }, { status: 400 });
    }

    console.log(`📰 [API] Processing ${headlines.length} headlines for detailed script generation`);
    
    // Add podcast intro
    const introScript = `Welcome to your personalized AI News Podcast! I'm excited to dive into ${headlines.length} fascinating stories from the world of artificial intelligence and technology. Let's get started.\n\n`;
    
    const storyScripts: string[] = [introScript];
    
    // Process each headline: research + script generation
    for (let i = 0; i < headlines.length; i++) {
      const headline = headlines[i];
      console.log(`\n🔄 [API] Processing story ${i + 1}/${headlines.length}: ${headline.slice(0, 80)}...`);
      
      // Step 1: Research the headline
      console.log(`📚 [API] Step 1: Researching story ${i + 1}...`);
      const researchResults = await researchHeadline(headline);
      console.log(`✅ [API] Research completed: ${researchResults.length} sources found`);
      
      // Step 2: Generate script based on research
      console.log(`✍️ [API] Step 2: Generating script for story ${i + 1}...`);
      const storyScript = await generateStoryScript(headline, researchResults);
      storyScripts.push(storyScript);
      console.log(`✅ [API] Script generated for story ${i + 1}`);
      
      // Add a brief pause between requests to respect rate limits
      if (i < headlines.length - 1) {
        console.log(`⏳ [API] Waiting 1 second before next story...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Add podcast outro
    const outroScript = `\n\nThat wraps up today's AI news roundup! Thanks for listening to your personalized podcast. Stay curious, and I'll catch you next time with more exciting developments from the world of artificial intelligence.`;
    storyScripts.push(outroScript);
    
    // Combine all scripts
    const fullScript = storyScripts.join('\n\n');
    
    console.log(`🎉 [API] Complete podcast script generated!`);
    console.log(`📊 [API] Total script length: ${fullScript.length} characters`);
    console.log(`⏱️ [API] Estimated reading time: ${Math.round(fullScript.length / 1000 * 3)} minutes`);
    
    return NextResponse.json({ 
      script: fullScript,
      stats: {
        storiesProcessed: headlines.length,
        scriptLength: fullScript.length,
        estimatedDuration: Math.round(fullScript.length / 1000 * 3)
      }
    });

  } catch (error) {
    console.error('❌ [API] Error in detailed script generation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate detailed podcast script' 
    }, { status: 500 });
  }
} 