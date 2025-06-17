import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

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

async function generateTTS(script: string, outPath: string): Promise<void> {
  const truncatedScript = truncateScript(script, 4000);
  console.log(`[TTS DEBUG] Original script length: ${script.length}, truncated: ${truncatedScript.length}`);
  
  const maxRetries = 3;
  const timeoutMs = 30000; // 30 seconds timeout
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TTS DEBUG] Making TTS request to OpenAI (attempt ${attempt}/${maxRetries})...`);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      
      const response = await fetch(OPENAI_TTS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: truncatedScript,
          voice: 'alloy',
          response_format: 'mp3',
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TTS DEBUG] OpenAI TTS API failed with status ${response.status}:`, errorText);
        
        // Check if it's a rate limit error (429) and wait before retrying
        if (response.status === 429 && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[TTS DEBUG] Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(`OpenAI TTS API failed (${response.status}): ${errorText}`);
      }
      
      console.log(`[TTS DEBUG] TTS request successful, writing to ${outPath}`);
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      await writeFile(outPath, audioBuffer);
      console.log(`[TTS DEBUG] Audio file written, size: ${audioBuffer.length} bytes`);
      return; // Success, exit retry loop
      
    } catch (error: any) {
      console.error(`[TTS DEBUG] TTS attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`TTS generation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[TTS DEBUG] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

async function concatAudio(files: string[], outPath: string): Promise<void> {
  console.log(`[TTS DEBUG] Concatenating ${files.length} files:`, files);
  
  // Check if ffmpeg is available
  try {
    await new Promise((resolve, reject) => {
      const testFFmpeg = spawn('ffmpeg', ['-version']);
      testFFmpeg.on('close', code => {
        if (code === 0) resolve(null);
        else reject(new Error('ffmpeg not available'));
      });
      testFFmpeg.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.log(`[TTS DEBUG] ffmpeg not available, using simple concatenation fallback`);
    // Simple binary concatenation as fallback (works for MP3s)
    const { readFile } = await import('fs/promises');
    const audioBuffers = await Promise.all(files.map(f => readFile(f)));
    const concatenated = Buffer.concat(audioBuffers);
    await writeFile(outPath, concatenated);
    console.log(`[TTS DEBUG] Simple concatenation complete, output size: ${concatenated.length} bytes`);
    return;
  }
  
  // Use ffmpeg if available
  const listPath = `/tmp/ffmpeg-list-${uuidv4()}.txt`;
  const listContent = files.map(f => `file '${f}'`).join('\n');
  console.log(`[TTS DEBUG] FFmpeg list content:\n${listContent}`);
  
  await writeFile(listPath, listContent);
  
  await new Promise((resolve, reject) => {
    console.log(`[TTS DEBUG] Running ffmpeg concatenation...`);
    const ffmpeg = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
    
    ffmpeg.stdout.on('data', (data) => {
      console.log(`[TTS DEBUG] ffmpeg stdout: ${data}`);
    });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`[TTS DEBUG] ffmpeg stderr: ${data}`);
    });
    
    ffmpeg.on('close', code => {
      console.log(`[TTS DEBUG] ffmpeg process exited with code ${code}`);
      if (code === 0) {
        resolve(null);
      } else {
        reject(new Error(`ffmpeg failed with exit code ${code}`));
      }
    });
  });
  
  await unlink(listPath);
  console.log(`[TTS DEBUG] Concatenation complete, output: ${outPath}`);
}

export async function POST(req: NextRequest) {
  console.log('[TTS DEBUG] POST request received');
  
  // Validate required environment variables at runtime
  if (!OPENAI_API_KEY) {
    console.error('❌ [API] OPENAI_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    console.log('[TTS DEBUG] Parsing request body...');
    const body = await req.json();
    console.log('[TTS DEBUG] Request body:', JSON.stringify(body, null, 2));
    
    let scripts: string[] = [];
    if (Array.isArray(body.scripts)) {
      scripts = body.scripts.filter((s: string) => typeof s === 'string' && s.trim().length > 0);
    } else if (typeof body.script === 'string') {
      scripts = [body.script];
    }
    if (scripts.length === 0) {
      console.log('[TTS DEBUG] No valid scripts found in request');
      return NextResponse.json({ error: 'No script(s) provided' }, { status: 400 });
    }

    // Log the number and length of scripts
    console.log(`[TTS DEBUG] Number of scripts: ${scripts.length}`);
    scripts.forEach((s, i) => console.log(`[TTS DEBUG] Script ${i + 1} length: ${s.length} chars`));

    console.log('🎵 [API] Generating audio with OpenAI TTS...');
    
    // Generate TTS for each story
    const audioFiles: string[] = [];
    for (let i = 0; i < scripts.length; i++) {
      console.log(`[TTS DEBUG] Generating TTS for story ${i + 1}/${scripts.length}...`);
      const outPath = `/tmp/story-${uuidv4()}.mp3`;
      await generateTTS(scripts[i], outPath);
      console.log(`[TTS DEBUG] Generated TTS file: ${outPath}`);
      audioFiles.push(outPath);
      
      // Add a small delay between requests to avoid rate limiting
      if (i < scripts.length - 1) {
        console.log(`[TTS DEBUG] Waiting 1 second between TTS requests...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[TTS DEBUG] Generated ${audioFiles.length} audio files`);
    
    // Concatenate if more than one
    let finalPath = audioFiles[0];
    if (audioFiles.length > 1) {
      console.log(`[TTS DEBUG] Concatenating ${audioFiles.length} audio files...`);
      finalPath = `/tmp/podcast-${uuidv4()}.mp3`;
      await concatAudio(audioFiles, finalPath);
      console.log(`[TTS DEBUG] Concatenated audio saved to: ${finalPath}`);
    } else {
      console.log(`[TTS DEBUG] Only one audio file, using directly: ${finalPath}`);
    }
    // Read and return the final audio
    console.log(`[TTS DEBUG] Reading final audio file: ${finalPath}`);
    const audioBuffer = await (await import('fs')).promises.readFile(finalPath);
    console.log(`[TTS DEBUG] Final audio buffer size: ${audioBuffer.byteLength} bytes`);
    
    // Clean up temp files
    console.log(`[TTS DEBUG] Cleaning up ${audioFiles.length} temporary files`);
    for (const f of audioFiles) await unlink(f).catch(() => {});
    if (audioFiles.length > 1) await unlink(finalPath).catch(() => {});

    console.log('✅ [API] Audio generated successfully, streaming to client...');

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
    return NextResponse.json({ error: 'Failed to generate podcast audio', details: error.message }, { status: 500 });
  }
} 