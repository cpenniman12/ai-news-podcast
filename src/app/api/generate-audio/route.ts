import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TTS_URL = process.env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech';

// Validate required environment variables
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

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

async function generateAudioFromScript(script: string): Promise<string> {
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

  // Get the audio buffer
  const buffer = Buffer.from(await response.arrayBuffer());
  // Save to public dir with a unique filename
  const filename = `podcast-${uuidv4()}.mp3`;
  const filePath = path.join(process.cwd(), 'public', filename);
  await fs.writeFile(filePath, buffer);
  // Return the URL to the audio file
  return `/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'No script provided' }, { status: 400 });
    }
    const audioUrl = await generateAudioFromScript(script);
    return NextResponse.json({ audioUrl });
  } catch (error: any) {
    console.error('Error generating podcast audio:', error);
    return NextResponse.json({ error: 'Failed to generate podcast audio' }, { status: 500 });
  }
} 