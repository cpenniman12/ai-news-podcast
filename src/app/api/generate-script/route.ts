import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PPLX_API_KEY = process.env.PPLX_API_KEY;
const PPLX_API_URL = process.env.PPLX_API_URL || 'https://api.perplexity.ai/chat/completions';

// Validate required environment variables
if (!PPLX_API_KEY) {
  throw new Error('PPLX_API_KEY environment variable is required');
}

async function generateScriptForHeadline(headline: string): Promise<string> {
  const prompt = `You are an expert podcast scriptwriter. Write a conversational, engaging 2-3 minute podcast segment discussing the following news story. Include context, why it matters, and a smooth transition. News story: ${headline}\n\nScript:`;
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