import axios from 'axios';

const PPLX_API_KEY = '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';
const PPLX_API_URL = 'https://api.perplexity.ai/chat/completions';

function getPast7DaysWindow() {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);

  const format = (date) =>
    date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // If the month is the same, omit the month in the end date for brevity
  if (start.getMonth() === end.getMonth()) {
    return `${format(start).replace(/, \d{4}$/, '')}-${end.getDate()}, ${end.getFullYear()}`;
  } else {
    return `${format(start)} - ${format(end)}`;
  }
}

async function testPerplexityAPI() {
  console.log('=== TESTING PERPLEXITY API ===');
  
  try {
    const window = getPast7DaysWindow();
    const prompt = `List 20 recent AI news headlines from the past 7 days (${window}).

Focus exclusively on:
- AI product launches and feature releases (ChatGPT, Claude, Gemini, Copilot, etc.)
- Major AI company announcements (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, etc.)
- AI company funding rounds, acquisitions, partnerships, or executive changes
- US government AI initiatives (Stargate project updates, executive orders, NIST guidelines, etc.)
- AI-related venture capital deals and market moves
- Regulatory developments from US agencies (FTC, SEC, Commerce Dept, etc.)
- Developer tool integrations and platform partnerships

Exclude:
- Academic research studies
- Industry surveys or macro trend reports
- Conference announcements or summit coverage
- General "AI adoption" stories
- Opinion pieces or analysis articles

Requirements:
- Only headlines from the past 7 days
- Each headline must represent a specific, concrete development
- Verify recency using current date references
- Prioritize announcements from major tech companies and government sources
- Focus on actionable business/policy developments, not theoretical discussions

Return only the numbered list of headlines with no additional text.
IMPORTANT: Do NOT include any reasoning, explanations, or internal thoughts. Only output the numbered list of headlines, with no other text.`;

    const response = await axios.post(
      PPLX_API_URL,
      {
        model: 'sonar-deep-research',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${PPLX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('=== FULL RAW PERPLEXITY API RESPONSE ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n=== MESSAGE CONTENT ONLY ===');
    console.log(response.data.choices?.[0]?.message?.content);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPerplexityAPI(); 