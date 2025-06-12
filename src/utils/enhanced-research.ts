import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_WEB_API_URL = process.env.BRAVE_WEB_API_URL || 'https://api.search.brave.com/res/v1/web/search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Runtime validation helpers
function validateBraveApiKey(): string {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY environment variable is required');
  }
  return BRAVE_API_KEY;
}

function validateOpenAiApiKey(): string {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return OPENAI_API_KEY;
}

const BRAVE_API_KEY_VALIDATED = validateBraveApiKey() as string;
const OPENAI_API_KEY_VALIDATED = validateOpenAiApiKey() as string;

// Rate limiting utility
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced search strategies with multiple angles per story type
const ENHANCED_SEARCH_STRATEGIES = [
  {
    name: "AI Product & Feature Releases",
    searches: [
      {
        query: "ChatGPT GPT-4 GPT-5 new features API updates latest 2024 2025",
        focus: "OpenAI products"
      },
      {
        query: "Claude Anthropic AI assistant new features API update release",
        focus: "Anthropic products"
      },
      {
        query: "Google Gemini Bard AI model new features update release",
        focus: "Google AI products"
      },
      {
        query: "Microsoft Copilot GitHub AI features update release latest",
        focus: "Microsoft AI products"
      },
      {
        query: "Meta AI LLaMA model release features update latest",
        focus: "Meta AI products"
      }
    ]
  },
  {
    name: "AI Company Strategic Moves",
    searches: [
      {
        query: "OpenAI company news announcement partnership deal latest",
        focus: "OpenAI business news"
      },
      {
        query: "Anthropic company announcement funding partnership news",
        focus: "Anthropic business news"
      },
      {
        query: "Google AI announcement partnership acquisition news latest",
        focus: "Google AI business"
      },
      {
        query: "Microsoft AI announcement partnership acquisition news",
        focus: "Microsoft AI business"
      },
      {
        query: "Meta AI announcement partnership acquisition news latest",
        focus: "Meta AI business"
      }
    ]
  },
  {
    name: "AI Startup Ecosystem",
    searches: [
      {
        query: "AI startup funding Series A B C venture capital latest 2024",
        focus: "Early-stage funding"
      },
      {
        query: "artificial intelligence startup acquisition merger deal latest",
        focus: "M&A activity"
      },
      {
        query: "AI startup IPO public offering investment news latest",
        focus: "Public markets"
      },
      {
        query: "AI company executive hire CEO CTO founder news latest",
        focus: "Leadership changes"
      },
      {
        query: "AI startup unicorn valuation billion funding round latest",
        focus: "High-value deals"
      }
    ]
  },
  {
    name: "AI Model & Research Breakthroughs",
    searches: [
      {
        query: "new AI model release breakthrough GPT Claude Gemini latest",
        focus: "Major model releases"
      },
      {
        query: "AI research paper breakthrough nature science publication",
        focus: "Academic breakthroughs"
      },
      {
        query: "AI capability milestone benchmark achievement latest news",
        focus: "Performance milestones"
      },
      {
        query: "multimodal AI model vision language release update latest",
        focus: "Multimodal advances"
      },
      {
        query: "AI reasoning planning capability breakthrough news latest",
        focus: "Reasoning advances"
      }
    ]
  },
  {
    name: "AI Infrastructure & Hardware",
    searches: [
      {
        query: "Nvidia AI chip GPU H100 H200 new release announcement",
        focus: "Nvidia hardware"
      },
      {
        query: "AMD AI chip GPU hardware announcement competition latest",
        focus: "AMD hardware"
      },
      {
        query: "Intel AI chip processor hardware announcement latest news",
        focus: "Intel hardware"
      },
      {
        query: "AI cloud infrastructure AWS Azure Google Cloud announcement",
        focus: "Cloud AI services"
      },
      {
        query: "AI datacenter infrastructure investment news latest 2024",
        focus: "Infrastructure investment"
      }
    ]
  },
  {
    name: "AI Regulation & Policy",
    searches: [
      {
        query: "AI regulation policy government announcement latest 2024",
        focus: "Government policy"
      },
      {
        query: "AI safety alignment research announcement news latest",
        focus: "AI safety"
      },
      {
        query: "AI ethics guidelines policy company announcement latest",
        focus: "AI ethics"
      },
      {
        query: "AI copyright intellectual property lawsuit news latest",
        focus: "Legal issues"
      },
      {
        query: "AI governance framework announcement company news latest",
        focus: "Corporate governance"
      }
    ]
  }
];

interface EnhancedSearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
  search_strategy: string;
  search_focus: string;
  search_query: string;
  relevance_score?: number;
  source_domain?: string;
}

interface ContentSimilarity {
  url1: string;
  url2: string;
  similarity: number;
  reason: string;
}

// Perform a single enhanced Brave search
async function performEnhancedBraveSearch(
  query: string, 
  strategy: string, 
  focus: string
): Promise<EnhancedSearchResult[]> {
  try {
    const response = await axios.get(BRAVE_WEB_API_URL, {
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY_VALIDATED,
        'Accept': 'application/json'
      },
      params: {
        q: query,
        count: 20, // Increased from default 8 to get more sources
        offset: 0,
        safesearch: 'moderate',
        search_lang: 'en',
        country: 'US',
        result_filter: 'web'
      },
      timeout: 30000
    });

    if (!response.data?.web?.results) {
      console.warn(`No results found for query: ${query}`);
      return [];
    }

    return response.data.web.results.map((item: any) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      description: item.description || '',
      page_age: item.page_age || '',
      search_strategy: strategy,
      search_focus: focus,
      search_query: query,
      source_domain: extractDomain(item.url || '')
    }));

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error(`Brave API error for query "${query}":`, error.response?.status, error.response?.data);
    } else {
      console.error(`Unexpected error for query "${query}":`, error.message);
    }
    return [];
  }
}

// Extract domain from URL for deduplication
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Calculate content similarity between two results
function calculateContentSimilarity(result1: EnhancedSearchResult, result2: EnhancedSearchResult): ContentSimilarity {
  const title1 = result1.title.toLowerCase();
  const title2 = result2.title.toLowerCase();
  const desc1 = result1.description.toLowerCase();
  const desc2 = result2.description.toLowerCase();
  
  // Check for URL similarity (same domain)
  if (result1.source_domain && result2.source_domain && 
      result1.source_domain === result2.source_domain) {
    return {
      url1: result1.url,
      url2: result2.url,
      similarity: 0.7,
      reason: "Same source domain"
    };
  }
  
  // Check for title overlap
  const titleWords1 = title1.split(' ').filter(word => word.length > 3);
  const titleWords2 = title2.split(' ').filter(word => word.length > 3);
  const titleOverlap = titleWords1.filter(word => titleWords2.includes(word)).length;
  const titleSimilarity = titleOverlap / Math.max(titleWords1.length, titleWords2.length);
  
  if (titleSimilarity > 0.6) {
    return {
      url1: result1.url,
      url2: result2.url,
      similarity: titleSimilarity,
      reason: `High title similarity (${Math.round(titleSimilarity * 100)}%)`
    };
  }
  
  // Check for description overlap
  const descWords1 = desc1.split(' ').filter(word => word.length > 4);
  const descWords2 = desc2.split(' ').filter(word => word.length > 4);
  const descOverlap = descWords1.filter(word => descWords2.includes(word)).length;
  const descSimilarity = descOverlap / Math.max(descWords1.length, descWords2.length);
  
  if (descSimilarity > 0.4) {
    return {
      url1: result1.url,
      url2: result2.url,
      similarity: descSimilarity,
      reason: `High description similarity (${Math.round(descSimilarity * 100)}%)`
    };
  }
  
  return {
    url1: result1.url,
    url2: result2.url,
    similarity: 0,
    reason: "No significant similarity"
  };
}

// Intelligent deduplication with source prioritization
function intelligentDeduplication(allResults: EnhancedSearchResult[]): EnhancedSearchResult[] {
  const similarities: ContentSimilarity[] = [];
  
  // Calculate all pairwise similarities
  for (let i = 0; i < allResults.length; i++) {
    for (let j = i + 1; j < allResults.length; j++) {
      const similarity = calculateContentSimilarity(allResults[i], allResults[j]);
      if (similarity.similarity > 0.3) {
        similarities.push(similarity);
      }
    }
  }
  
  // Group similar results
  const groups: string[][] = [];
  const urlToGroup = new Map<string, number>();
  
  for (const sim of similarities) {
    const group1 = urlToGroup.get(sim.url1);
    const group2 = urlToGroup.get(sim.url2);
    
    if (group1 !== undefined && group2 !== undefined) {
      // Merge groups
      if (group1 !== group2) {
        const smallerGroup = groups[group1].length < groups[group2].length ? group1 : group2;
        const largerGroup = groups[group1].length >= groups[group2].length ? group1 : group2;
        
        groups[largerGroup].push(...groups[smallerGroup]);
        groups[smallerGroup] = [];
        
        // Update mappings
        for (const url of groups[largerGroup]) {
          urlToGroup.set(url, largerGroup);
        }
      }
    } else if (group1 !== undefined) {
      groups[group1].push(sim.url2);
      urlToGroup.set(sim.url2, group1);
    } else if (group2 !== undefined) {
      groups[group2].push(sim.url1);
      urlToGroup.set(sim.url1, group2);
    } else {
      // Create new group
      const newGroupIndex = groups.length;
      groups.push([sim.url1, sim.url2]);
      urlToGroup.set(sim.url1, newGroupIndex);
      urlToGroup.set(sim.url2, newGroupIndex);
    }
  }
  
  // Source authority ranking (higher is better)
  const sourceRanking = new Map([
    // Tech News Authority
    ['techcrunch.com', 10],
    ['arstechnica.com', 9],
    ['theverge.com', 9],
    ['venturebeat.com', 8],
    ['engadget.com', 8],
    ['wired.com', 8],
    
    // AI/ML Specific
    ['artificialintelligence-news.com', 9],
    ['towardsdatascience.com', 8],
    ['openai.com', 10],
    ['anthropic.com', 10],
    ['deepmind.com', 10],
    
    // Business News
    ['bloomberg.com', 9],
    ['reuters.com', 9],
    ['wsj.com', 9],
    ['ft.com', 9],
    ['forbes.com', 8],
    ['businessinsider.com', 7],
    
    // Academic/Research
    ['arxiv.org', 10],
    ['nature.com', 10],
    ['science.org', 10],
    ['mit.edu', 9],
    ['stanford.edu', 9],
    
    // Company Blogs
    ['blog.google', 8],
    ['engineering.fb.com', 8],
    ['openai.com/blog', 10],
    ['www.anthropic.com/news', 10]
  ]);
  
  // Select best representative from each group
  const selected: EnhancedSearchResult[] = [];
  const selectedUrls = new Set<string>();
  
  for (const group of groups) {
    if (group.length === 0) continue;
    
    const groupResults = allResults.filter(result => group.includes(result.url));
    
    // Sort by authority score, then by recency
    const bestResult = groupResults.sort((a, b) => {
      const scoreA = sourceRanking.get(a.source_domain || '') || 5;
      const scoreB = sourceRanking.get(b.source_domain || '') || 5;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If same authority, prefer more recent (assuming page_age is in format like "1 day ago")
      return (a.page_age || '').localeCompare(b.page_age || '');
    })[0];
    
    if (bestResult) {
      selected.push(bestResult);
      selectedUrls.add(bestResult.url);
    }
  }
  
  // Add ungrouped results
  for (const result of allResults) {
    if (!urlToGroup.has(result.url) && !selectedUrls.has(result.url)) {
      selected.push(result);
    }
  }
  
  // Final sort by authority and return top results
  return selected
    .sort((a, b) => {
      const scoreA = sourceRanking.get(a.source_domain || '') || 5;
      const scoreB = sourceRanking.get(b.source_domain || '') || 5;
      return scoreB - scoreA;
    })
    .slice(0, 50); // Return top 50 unique results
}

// Gather enhanced search results from all strategies
async function gatherEnhancedSearchResults(): Promise<EnhancedSearchResult[]> {
  const allResults: EnhancedSearchResult[] = [];
  
  console.log('🔍 Starting enhanced research with 30 targeted searches...');
  
  let searchCount = 0;
  for (const strategy of ENHANCED_SEARCH_STRATEGIES) {
    console.log(`📊 Processing strategy: ${strategy.name}`);
    
    for (const search of strategy.searches) {
      searchCount++;
      try {
        console.log(`  🔎 Search ${searchCount}/30: ${search.focus}`);
        
        const results = await performEnhancedBraveSearch(
          search.query,
          strategy.name,
          search.focus
        );
        
        allResults.push(...results);
        console.log(`    ✅ Found ${results.length} results`);
        
        // Rate limiting: 3 second delay between searches
        if (searchCount < 30) {
          await delay(3000);
        }
        
      } catch (error: any) {
        console.error(`    ❌ Search failed for ${search.focus}:`, error.message);
        // Continue with next search even if one fails
      }
    }
  }
  
  console.log(`📈 Total raw results collected: ${allResults.length}`);
  
  // Apply intelligent deduplication
  console.log('🧹 Applying intelligent deduplication...');
  const deduplicatedResults = intelligentDeduplication(allResults);
  console.log(`✨ Refined to ${deduplicatedResults.length} unique, high-quality results`);
  
  return deduplicatedResults;
}

// Refine results using GPT-4o for better headline selection
async function refineWithAdvancedGPT(searchResults: EnhancedSearchResult[]): Promise<string[]> {
  if (searchResults.length === 0) {
    console.warn('No search results to refine');
    return [];
  }
  
  // Group results by strategy for better analysis
  const strategySummary = ENHANCED_SEARCH_STRATEGIES.map(strategy => {
    const strategyResults = searchResults.filter(r => r.search_strategy === strategy.name);
    return `${strategy.name} (${strategyResults.length} sources)`;
  }).join(', ');
  
  const prompt = `You are an expert AI news analyst tasked with selecting the most significant AI technology headlines from comprehensive research.

RESEARCH SUMMARY:
- Conducted 30 targeted searches across 6 key AI domains
- Collected ${searchResults.length} high-quality, deduplicated sources
- Coverage: ${strategySummary}

SOURCES ANALYZED:
${searchResults.slice(0, 100).map((result, index) => 
  `${index + 1}. [${result.search_strategy}] ${result.title}
     Focus: ${result.search_focus}
     Source: ${result.source_domain}
     Description: ${result.description.substring(0, 150)}...
`).join('\n')}

SELECTION CRITERIA:
- Choose exactly 25 headlines that best represent current AI industry developments
- Prioritize: Breaking news, major product launches, significant funding, research breakthroughs
- Ensure diversity across all 6 strategy categories
- Focus on stories with broad industry impact
- Prefer authoritative sources (OpenAI, Anthropic, Google, major tech outlets)

Return ONLY a numbered list of 25 selected headlines, formatted as:
1. [Exact headline from sources]
2. [Exact headline from sources]
...
25. [Exact headline from sources]

No explanations, just the pure list of 25 headlines.`;

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI technology news analyst with deep knowledge of the AI industry landscape.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY_VALIDATED}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from GPT-4o');
    }

    // Parse the numbered list
    const headlines = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => /^\d+\./.test(line)) // Only lines starting with number and period
      .map((line: string) => line.replace(/^\d+\.\s*/, '')) // Remove numbering
      .filter((line: string) => line.length > 10); // Filter out very short lines

    console.log(`🤖 GPT-4o refined selection: ${headlines.length} headlines chosen`);
    return headlines.slice(0, 25); // Ensure exactly 25 headlines

  } catch (error: any) {
    console.error('❌ GPT-4o refinement failed:', error.message);
    
    // Fallback: return top headlines by source authority
    const fallbackHeadlines = searchResults
      .slice(0, 25)
      .map(result => result.title);
    
    console.log(`📋 Using fallback selection: ${fallbackHeadlines.length} headlines`);
    return fallbackHeadlines;
  }
}

// Main export function
export async function fetchEnhancedTechNewsHeadlines(): Promise<string[]> {
  try {
    console.log('🚀 Starting enhanced AI news research...');
    
    // Gather comprehensive search results
    const searchResults = await gatherEnhancedSearchResults();
    
    if (searchResults.length === 0) {
      console.warn('No search results found');
      return [];
    }
    
    // Refine with GPT-4o for optimal selection
    const refinedHeadlines = await refineWithAdvancedGPT(searchResults);
    
    console.log(`✅ Enhanced research complete: ${refinedHeadlines.length} high-quality headlines selected`);
    return refinedHeadlines;
    
  } catch (error: any) {
    console.error('❌ Enhanced research failed:', error.message);
    throw error;
  }
}

// Test function for development
export async function testEnhancedResearch(): Promise<string[]> {
  console.log('🧪 Testing enhanced research functionality...');
  
  try {
    const headlines = await fetchEnhancedTechNewsHeadlines();
    
    console.log('✅ Test completed successfully');
    console.log(`Headlines found: ${headlines.length}`);
    headlines.forEach((headline, index) => {
      console.log(`${index + 1}. ${headline}`);
    });
    
    return headlines;
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
} 