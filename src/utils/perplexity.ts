import axios from 'axios';

const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_API_URL = process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';

// Runtime validation helper
function validateApiKey(): string {
  if (!PPLX_API_KEY) {
    throw new Error('PPLX_API_KEY environment variable is required');
  }
  return PPLX_API_KEY;
}

function getPast7DaysWindow(): string {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);

  const format = (date: Date) =>
    date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // If the month is the same, omit the month in the end date for brevity
  if (start.getMonth() === end.getMonth()) {
    return `${format(start).replace(/, \\d{4}$/, '')}-${end.getDate()}, ${end.getFullYear()}`;
  } else {
    return `${format(start)} - ${format(end)}`;
  }
}

// Fetch top AI/tech news headlines
export async function fetchTechNewsHeadlines(): Promise<string[]> {
  console.log('🔌 fetchTechNewsHeadlines called');
  try {
    const window = getPast7DaysWindow();
    console.log('📅 Date window:', window);
    
    const prompt = `Conduct a comprehensive search across all available sources before compiling the list. Use web search to find recent AI developments - do not limit results due to source availability.

List 20 recent AI news headlines from the past 2 weeks (May 18-June 1, 2025).

Focus exclusively on:
- AI product launches, feature releases, and API updates (ChatGPT, Claude, Gemini, Copilot, etc.)
- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, AMD, etc.)
- AI startup funding rounds (Series A and above), acquisitions, partnerships, or key executive hires
- AI-related venture capital deals, public market moves, or major contracts
- New AI model releases or significant capability upgrades
- Developer tool integrations and platform partnerships
- AI chip/hardware announcements from Nvidia, AMD, Intel, etc.

Requirements:
- Include stories with specific dates within the past 2 weeks
- Each headline must represent a concrete, actionable development
- Prioritize official announcements over speculation or rumors
- Include funding amounts, version numbers, or other specific details when available
- Search thoroughly across all sources before finalizing the list

Format: **Headline** (Date)

Return only the numbered list of headlines with no additional text.
IMPORTANT: Do NOT include any reasoning, explanations, or internal thoughts. Only output the numbered list of headlines, with no other text.`;

    console.log('🚀 Making Perplexity API call...');
    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${validateApiKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ Perplexity API response received');
    console.log('📊 Usage:', response.data.usage);
    
    // Log the full raw output from the Perplexity API
    console.log('Perplexity API raw output:', response.data.choices?.[0]?.message?.content || JSON.stringify(response.data));
    
    // Parse the response to extract headlines
    const content = response.data.choices?.[0]?.message?.content || '';
    console.log('📝 Raw content length:', content.length);
    
    const parsedHeadlines = content
      .split('\n')
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
      
    console.log('📰 Parsed headlines count:', parsedHeadlines.length);
    console.log('📋 First few headlines:', parsedHeadlines.slice(0, 3));
    
    return parsedHeadlines;
  } catch (error) {
    console.error('Error fetching headlines:', error);
    throw new Error('Failed to fetch news headlines');
  }
}

// Generate a podcast script from selected headlines
export async function generatePodcastScript(headlines: string[]): Promise<string> {
  try {
    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: `You are an expert podcast scriptwriter. Write a conversational, engaging script for a 10-15 minute podcast episode that covers the following AI and technology news stories. Include smooth transitions, a friendly host introduction, and a closing. Here are the stories:\n${headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}\n\nScript:`
          }
        ],
        max_tokens: 1200,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${validateApiKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating script:', error);
    throw new Error('Failed to generate podcast script');
  }
}

// Test Perplexity API with a custom prompt
export async function testPerplexityNBAQuery(): Promise<string> {
  try {
    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: 'Who did Knicks last play in the NBA?'
          }
        ],
        max_tokens: 100,
        temperature: 0.2,
      },
      {
        headers: {
          'Authorization': `Bearer ${validateApiKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error testing Perplexity NBA query:', error);
    throw new Error('Failed to test Perplexity NBA query');
  }
}

// CLI entry point for direct testing
if (require.main === module) {
  (async () => {
    try {
      const result = await testPerplexityNBAQuery();
      console.log('Perplexity NBA Query Result:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  })();
} 