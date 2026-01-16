import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// Validate API key at runtime
function validateApiKey(): string {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return ANTHROPIC_API_KEY;
}

// Create Anthropic client
export function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: validateApiKey(),
  });
}

// Interface for search results
interface SearchResult {
  title: string;
  description: string;
  url: string;
  published?: string;
}

/**
 * Call Brave Search API and return trimmed results (just titles + snippets)
 * This keeps token usage low - typically ~100 tokens per 10 results
 */
async function searchWithBrave(query: string, count: number = 20): Promise<SearchResult[]> {
  if (!BRAVE_API_KEY) {
    console.warn('⚠️ [Brave] No API key configured, returning empty results');
    return [];
  }

  // Brave free tier max is 20 results per request
  const limitedCount = Math.min(count, 20);
  console.log(`🔍 [Brave] Searching: "${query}" (${limitedCount} results)`);

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(limitedCount));
    url.searchParams.set('freshness', 'pw'); // Past week
    url.searchParams.set('text_decorations', 'false');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`❌ [Brave] Search failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = (data.web?.results || []).map((r: { title?: string; description?: string; url?: string; age?: string }) => ({
      title: r.title || '',
      description: (r.description || '').slice(0, 200), // Trim to 200 chars max
      url: r.url || '',
      published: r.age || '',
    }));

    console.log(`✅ [Brave] Found ${results.length} results`);
    return results;

  } catch (error) {
    console.error('❌ [Brave] Search error:', error);
    return [];
  }
}

/**
 * Format search results as a compact string for Claude
 */
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  return results.map((r, i) => 
    `${i + 1}. "${r.title}" - ${r.description}${r.published ? ` (${r.published})` : ''}`
  ).join('\n');
}

// Custom tool definition for news search
const NEWS_SEARCH_TOOL: Anthropic.Messages.Tool = {
  name: 'search_news',
  description: 'Search for recent AI and technology news headlines. Returns titles and brief descriptions. Use this to find news from the past week. You can call this multiple times with different queries to find diverse stories.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query for finding news (e.g., "OpenAI GPT announcement", "AI startup funding", "NVIDIA AI chips")'
      },
      count: {
        type: 'number',
        description: 'Number of results to return (default 20, max 20)'
      }
    },
    required: ['query']
  }
};

// System prompt for headline compilation agent
const HEADLINE_SYSTEM_PROMPT = `You are an expert AI news curator for a daily podcast about artificial intelligence developments that builders and entrepreneurs care about.

Your job is to compile the 20 BEST AI/tech headlines from the past 7 days. Focus on stories that represent the most important, discussion-worthy AI developments.

You have access to a search_news tool. USE IT to search for recent AI news. You should do multiple searches to cover different topics:
- Major AI company news (OpenAI, Anthropic, Google, Microsoft, Meta)
- AI product release
- AI model releases and updates
- AI startup funding and acquisitions
- AI infrastructure (datacenters, chips)

TARGET AUDIENCE: AI builders, entrepreneurs, developers, and tech leaders who want to stay current on:
- New AI capabilities they can use in their products
- Strategic moves by major AI companies  
- Breakthrough research with practical implications
- Funding and business developments in AI
- New tools and platforms for AI development
**Your user base is especially interested in news around AI agents in the enterprise**


STRICT REQUIREMENTS FOR SELECTION:

✅ MUST INCLUDE (all of these are required):
1. SPECIFIC company, person, or organization name mentioned
2. SPECIFIC action or event (launched, released, raised, announced, acquired, hired, etc.)
3. From the past 7 days only
4. Concrete business or technical impact

❌ ABSOLUTELY REJECT:
- Any headline containing words: "best", "top", "alternatives", "guide", "how to", "tutorial", "explained"
- Educational content or explainers
- Listicles or rankings
- Opinion pieces without a concrete news hook
- Regulatory battles, lawsuits, or AI safety controversies (unless major)
- Vague headlines without clear company/person attribution

PRIORITIZE THESE CATEGORIES (in order):
1. **AI Agent & Developer Tools** - New platforms, APIs, coding assistants (claude code, cursor, etc), agent frameworks
2. **AI Product Launches** - Consumer/enterprise products with AI features
3. **AI Model Releases & Capabilities** - New models, performance improvements, multimodal features
4. **AI Hardware & Infrastructure** - Chips and datacenters
5. **Strategic Business Moves** - Major funding ($50M+), acquisitions, partnerships, executive moves
6. **Research Breakthroughs** - Scientific advances with clear practical applications

DIVERSITY REQUIREMENTS:
- Include stories from different companies (not all OpenAI/Google)
- Mix of different story types (though remember priorities)
- Balance between big tech and startups

OUTPUT FORMAT:
After searching, return exactly 20 headlines, each on a new line, in this format:
**Headline Title** (Date)

Example:
**NVIDIA to invest up to $100B in OpenAI** (January 2, 2026)
**Claude Sonnet 4.5 released with improved reasoning** (January 1, 2026)`;

// System prompt for script writer agent
const SCRIPT_SYSTEM_PROMPT = `You are an expert podcast host creating engaging segments about AI/tech news stories.

Your style is:
- Conversational and warm, as if speaking directly to listeners
- Knowledgeable but accessible - explain technical concepts simply
- Enthusiastic about AI developments without being hyperbolic
- Focused on the "so what" - why this would matter to an AI product manager building coding agents
- Concise and to the point

CRITICAL: Write the ACTUAL podcast script. Do NOT write meta-commentary like "Looking at the results..." or "Let me craft...".
Just write the spoken words the host would say.

You have access to a search_news tool. USE IT to look up the full details about the headline you're given. This will give you accurate, up-to-date information to include in your script instead of relying on outdated training data.

For each story segment:
- FIRST: Use search_news to look up the headline and get current details
- Write a 2-3 minute segment (approximately 300-450 words)
- Cut straight to the story - NO intro or greeting
- Explain the key details: who, what, when, where, why.
- Include specific numbers, funding amounts, or technical details.
- Include specific quotes from key people from X/Twitter or from company release (this is great to have!). be concise and to the point when you present these quotes.
- If its a product release, concisely explain how it may fit into an engineer or product managers workflow
- End with a smooth transition phrase that leads into the next story

CRITICAL: be 100% sure everything in your story is accurate. your highest priority is accuracy. Always search for the story first to verify details.

Format: Write ONLY the spoken script text. No stage directions, no metadata, no explanations about what you're doing.`;

/**
 * Fetch fresh AI/tech headlines using Claude with custom search tool
 * Returns 20 curated headlines
 */
export async function fetchHeadlinesWithClaude(): Promise<string[]> {
  console.log('🤖 [Claude] Starting headline compilation with custom search tool...');
  
  const client = createAnthropicClient();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const userPrompt = `Today is ${dateStr}. Use the search_news tool to find the most important AI and technology news headlines from the past 7 days.

Do multiple searches to cover different topics - for example:
1. Search for major AI announcements
2. Search for AI startup news and funding
3. Search for AI model releases
4. Search for any other relevant AI news

After collecting search results, curate exactly 20 of the BEST headlines that fit our criteria.

IMPORTANT: Each headline must be a SPECIFIC news event with a company name, action, and date. Do NOT return category names or source names.

Format each headline like this:
1. **OpenAI releases GPT-5 with advanced reasoning capabilities** (January 2, 2026)

Generate exactly 20 headlines, numbered 1-20, each starting with ** and ending with a date in parentheses.`;

  try {
    let messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: userPrompt }
    ];

    let response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: HEADLINE_SYSTEM_PROMPT,
      tools: [NEWS_SEARCH_TOOL],
      messages,
    });

    console.log('📊 [Claude] Initial response - stop_reason:', response.stop_reason);

    // Agentic loop: Handle tool calls
    let loopCount = 0;
    const maxLoops = 10;

    while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
      loopCount++;
      console.log(`🔄 [Claude] Tool use loop ${loopCount}...`);

      // Get tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );

      // Add assistant message
      messages.push({ role: 'assistant', content: response.content });

      // Process each tool call and get results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      
      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'search_news') {
          const input = toolUse.input as { query: string; count?: number };
          const searchResults = await searchWithBrave(input.query, input.count || 20);
          const formattedResults = formatSearchResults(searchResults);
          
          console.log(`📊 [Claude] Search returned ${searchResults.length} results, ~${formattedResults.length} chars`);
          
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formattedResults,
          });
        }
      }

      // Add tool results
      messages.push({ role: 'user', content: toolResults });

      // Continue conversation
      response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: HEADLINE_SYSTEM_PROMPT,
        tools: [NEWS_SEARCH_TOOL],
        messages,
      });

      console.log(`📊 [Claude] Loop ${loopCount} - stop_reason:`, response.stop_reason);
      console.log(`📊 [Claude] Loop ${loopCount} - usage:`, response.usage);
    }

    // Extract text content from the final response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.error('❌ [Claude] No text content in response. Content blocks:', response.content.map(b => b.type));
      throw new Error('No text content in Claude response');
    }

    // Parse headlines from response
    console.log('📝 [Claude] Raw response:', textContent.text.slice(0, 500));
    
    const headlines = textContent.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Match lines that contain ** and look like headlines
        return (line.includes('**') && line.includes('(')) || 
               line.match(/^\d+\.\s*\*\*/) ||
               line.match(/^-\s*\*\*/) ||
               line.match(/^\*\*[A-Z]/);
      })
      .map(line => {
        // Remove leading numbers, dashes, or bullets
        return line.replace(/^[\d]+\.\s*/, '')
                   .replace(/^-\s*/, '')
                   .replace(/^•\s*/, '')
                   .trim();
      })
      .filter(line => line.length > 10)
      .slice(0, 20);

    console.log(`📰 [Claude] Parsed ${headlines.length} headlines`);
    console.log('📋 [Claude] Sample headlines:', headlines.slice(0, 3));
    console.log(`📊 [Claude] Total loops: ${loopCount}, Final usage:`, response.usage);

    return headlines;

  } catch (error) {
    console.error('❌ [Claude] Error fetching headlines:', error);
    throw error;
  }
}

/**
 * Generate a podcast script for a single headline using Claude with search tool access
 */
export async function generateScriptWithClaude(headline: string): Promise<string> {
  console.log(`✍️ [Claude] Generating script for: ${headline.slice(0, 80)}...`);

  const client = createAnthropicClient();

  try {
    const userPrompt = `Write a podcast segment (300-450 words) about this AI/tech news story:

${headline}

IMPORTANT:
1. FIRST use the search_news tool to look up this headline and get accurate, current details
2. THEN write ONLY the spoken words. Do not write any meta-commentary like "Looking at the results..." or "Let me clarify...".
   Just write what the podcast host would actually say out loud.

Include:
- Key details and context about the story
- Specific numbers, amounts, or technical specifications
- Why this matters for AI builders and entrepreneurs
- A smooth transition phrase at the end to lead into the next story

Write only the spoken script text, ready to be read aloud. Start immediately with the content.`;

    let messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: userPrompt }
    ];

    let response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: SCRIPT_SYSTEM_PROMPT,
      tools: [NEWS_SEARCH_TOOL],
      messages,
    });

    console.log('📊 [Claude Script] Initial response - stop_reason:', response.stop_reason);

    // Agentic loop: Handle tool calls
    let loopCount = 0;
    const maxLoops = 5;

    while (response.stop_reason === 'tool_use' && loopCount < maxLoops) {
      loopCount++;
      console.log(`🔄 [Claude Script] Tool use loop ${loopCount}...`);

      // Get tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );

      // Add assistant message
      messages.push({ role: 'assistant', content: response.content });

      // Process each tool call and get results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === 'search_news') {
          const input = toolUse.input as { query: string; count?: number };
          const searchResults = await searchWithBrave(input.query, input.count || 10);
          const formattedResults = formatSearchResults(searchResults);

          console.log(`📊 [Claude Script] Search returned ${searchResults.length} results`);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: formattedResults,
          });
        }
      }

      // Add tool results
      messages.push({ role: 'user', content: toolResults });

      // Continue conversation
      response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: SCRIPT_SYSTEM_PROMPT,
        tools: [NEWS_SEARCH_TOOL],
        messages,
      });

      console.log(`📊 [Claude Script] Loop ${loopCount} - stop_reason:`, response.stop_reason);
    }

    // Extract text content from the final response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const script = textContent.text.trim();
    console.log(`✅ [Claude] Script generated: ${script.length} characters (${loopCount} search loops)`);
    console.log(`📊 [Claude] Script usage:`, response.usage);

    return script;

  } catch (error) {
    console.error(`❌ [Claude] Error generating script:`, error);
    return `I'm sorry, but I encountered an issue generating the detailed script for this story: ${headline}. Let me move on to the next story.`;
  }
}

/**
 * Generate scripts for multiple headlines
 */
export async function generateScriptsWithClaude(headlines: string[]): Promise<{
  scripts: string[];
  fullScript: string;
}> {
  console.log(`🎙️ [Claude] Generating scripts for ${headlines.length} headlines...`);
  
  const scripts: string[] = [];

  for (let i = 0; i < headlines.length; i++) {
    const headline = headlines[i];
    console.log(`\n🔄 [Claude] Processing story ${i + 1}/${headlines.length}...`);
    
    const script = await generateScriptWithClaude(headline);
    scripts.push(script);
    
    // Add a brief pause between requests to respect rate limits
    if (i < headlines.length - 1) {
      console.log(`⏳ [Claude] Waiting 1 second before next story...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const fullScript = scripts.join('\n\n');
  
  console.log(`🎉 [Claude] Complete podcast script generated!`);
  console.log(`📊 [Claude] Total script length: ${fullScript.length} characters`);
  console.log(`⏱️ [Claude] Estimated reading time: ${Math.round(fullScript.length / 1000 * 3)} minutes`);

  return { scripts, fullScript };
}

