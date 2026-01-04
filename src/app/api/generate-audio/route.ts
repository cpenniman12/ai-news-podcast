import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, readFile, copyFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

// Increase route timeout to 5 minutes for long-running TTS operations
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

/**
 * Split a long script into chunks that fit within TTS limits
 * OpenAI TTS has a limit of ~4096 characters per request
 */
function chunkScript(script: string, maxChunkLength: number = 4000): string[] {
  if (script.length <= maxChunkLength) {
    return [script];
  }
  
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < script.length) {
    const remaining = script.length - currentIndex;
    const chunkSize = Math.min(maxChunkLength, remaining);
    
    let chunkEnd = currentIndex + chunkSize;
    
    // If not the last chunk, try to break at sentence boundary
    if (chunkEnd < script.length) {
      const chunkText = script.substring(currentIndex, chunkEnd);
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastExclamation = chunkText.lastIndexOf('!');
      const lastQuestion = chunkText.lastIndexOf('?');
      const lastNewline = chunkText.lastIndexOf('\n\n');
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion, lastNewline);
      
      if (lastSentenceEnd > chunkSize * 0.7) {
        // Found a good break point in the last 30% of chunk
        chunkEnd = currentIndex + lastSentenceEnd + 1;
      }
    }
    
    chunks.push(script.substring(currentIndex, chunkEnd).trim());
    currentIndex = chunkEnd;
  }
  
  return chunks;
}

async function generateTTS(script: string, outPath: string, apiKey: string, ttsUrl: string): Promise<void> {
  const scriptChunks = chunkScript(script, 4000);
  console.log(`[TTS DEBUG] Original script length: ${script.length}, split into ${scriptChunks.length} chunk(s)`);
  
  const maxRetries = 3;
  const timeoutMs = 60000; // 60 seconds timeout (increased for longer scripts)
  
  // Generate TTS for each chunk and concatenate
  const chunkAudioFiles: string[] = [];
  
  for (let chunkIndex = 0; chunkIndex < scriptChunks.length; chunkIndex++) {
    const chunk = scriptChunks[chunkIndex];
    const chunkOutPath = `/tmp/chunk-${uuidv4()}.mp3`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[TTS DEBUG] Making TTS request for chunk ${chunkIndex + 1}/${scriptChunks.length} (attempt ${attempt}/${maxRetries})...`);
        console.log(`[TTS DEBUG] Chunk length: ${chunk.length} characters`);
        
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutMs);
        
        const response = await fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1-hd',
            input: chunk,
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
        
        console.log(`[TTS DEBUG] TTS request successful for chunk ${chunkIndex + 1}, writing to ${chunkOutPath}`);
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        await writeFile(chunkOutPath, audioBuffer);
        console.log(`[TTS DEBUG] Chunk audio file written, size: ${audioBuffer.length} bytes`);
        chunkAudioFiles.push(chunkOutPath);
        break; // Success, exit retry loop for this chunk
        
      } catch (error: any) {
        console.error(`[TTS DEBUG] TTS attempt ${attempt} for chunk ${chunkIndex + 1} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // Clean up any partial chunks
          for (const f of chunkAudioFiles) await unlink(f).catch(() => {});
          throw new Error(`TTS generation failed after ${maxRetries} attempts for chunk ${chunkIndex + 1}: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[TTS DEBUG] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Small delay between chunks to avoid rate limiting
    if (chunkIndex < scriptChunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Concatenate all chunks into final audio file
  if (chunkAudioFiles.length === 1) {
    // Only one chunk, just copy it to the output path
    await copyFile(chunkAudioFiles[0], outPath);
    await unlink(chunkAudioFiles[0]).catch(() => {});
  } else {
    // Multiple chunks, concatenate them
    await concatAudio(chunkAudioFiles, outPath);
    // Clean up chunk files
    for (const f of chunkAudioFiles) await unlink(f).catch(() => {});
  }
  
  console.log(`[TTS DEBUG] Complete TTS audio written to ${outPath}`);
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
  
  // Read environment variables at runtime
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_TTS_URL = process.env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech';
  
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
      await generateTTS(scripts[i], outPath, OPENAI_API_KEY, OPENAI_TTS_URL);
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
    const audioBuffer = await readFile(finalPath);
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
