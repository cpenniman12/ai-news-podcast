import { NextRequest, NextResponse } from 'next/server';
import { generateScriptsWithClaude } from '@/utils/claude-agent';

export async function POST(req: NextRequest) {
  // Validate required environment variables at runtime
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ [API] ANTHROPIC_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { headlines } = await req.json();
    if (!Array.isArray(headlines) || headlines.length === 0) {
      return NextResponse.json({ error: 'No headlines provided' }, { status: 400 });
    }
    
    // Generate scripts using Claude
    const { fullScript } = await generateScriptsWithClaude(headlines);
    
    return NextResponse.json({ script: fullScript });
  } catch (error: unknown) {
    console.error('Error generating podcast script:', error);
    return NextResponse.json({ error: 'Failed to generate podcast script' }, { status: 500 });
  }
}
