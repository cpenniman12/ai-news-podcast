import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { fetchTechNewsHeadlines, generatePodcastScript } from '@/utils/perplexity';

const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_API_URL = process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';

async function generateScriptForHeadline(headline: string): Promise<string> {
  const prompt = `You are an expert podcast scriptwriter. Write a conversational, engaging 2-3 minute podcast segment discussing the following news story. 

**Instructions:**
- Cut straight to the story - NO intro or greeting  
- Include context, why it matters, and a smooth transition
- IMPORTANT: Include primary source quotes from journalists, company executives, public figures, or other relevant sources whenever possible
- Use actual quotes like: "As CEO John Smith stated, 'This technology will revolutionize how we work'"
- Or: "The company's press release emphasized that 'privacy remains our top priority'"

News story: ${headline}

Script:`;
  const response = await axios.post(
    PPLX_API_URL,
    {
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${PPLX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices?.[0]?.message?.content?.trim() || '';
}

export async function POST(req: NextRequest) {
  // Validate required environment variables at runtime
  if (!PPLX_API_KEY) {
    console.error('❌ [API] PPLX_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'PPLX_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { headlines } = await req.json();
    if (!Array.isArray(headlines) || headlines.length === 0) {
      return NextResponse.json({ error: 'No headlines provided' }, { status: 400 });
    }
    // Generate a script for each headline in parallel
    const scripts = await Promise.all(headlines.map(generateScriptForHeadline));
    // Combine scripts with transitions
    const combinedScript = scripts.join('\n\n');
    return NextResponse.json({ script: combinedScript });
  } catch (error: any) {
    console.error('Error generating podcast script:', error);
    return NextResponse.json({ error: 'Failed to generate podcast script' }, { status: 500 });
  }
} 