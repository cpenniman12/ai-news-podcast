import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TTS_URL = process.env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech';

function truncateScript(script: string, maxLength: number = 4000): string {
  if (script.length <= maxLength) return script;
  
  // Try to cut at sentence boundary
  const truncated = script.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd > maxLength * 0.8) {
    // If we found a sentence boundary in the last 20% of text, use it
    return truncated.substring(0, lastSentenceEnd + 1);
  } else {
    // Otherwise, just truncate and add ellipsis
    return truncated + '...';
  }
}

export async function POST(req: NextRequest) {
  // Validate required environment variables at runtime
  if (!OPENAI_API_KEY) {
    console.error('❌ [API] OPENAI_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { script } = await req.json();
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'No script provided' }, { status: 400 });
    }

    console.log('🎵 [API] Generating audio with OpenAI TTS...');
    
    // Truncate script to fit OpenAI TTS character limit
    const truncatedScript = truncateScript(script, 4000);
    
    // Call OpenAI TTS API
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncatedScript,
        voice: 'alloy',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', errorText);
      throw new Error('OpenAI TTS API failed');
    }

    console.log('✅ [API] Audio generated successfully, streaming to client...');

    // Stream the audio directly to the client instead of saving to file
    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': 'inline; filename="podcast.mp3"',
      },
    });

  } catch (error: any) {
    console.error('Error generating podcast audio:', error);
    return NextResponse.json({ error: 'Failed to generate podcast audio' }, { status: 500 });
  }
} 