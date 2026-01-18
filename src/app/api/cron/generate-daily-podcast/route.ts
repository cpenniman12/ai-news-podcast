import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { fetch5HeadlinesForPodcast, generateScriptsWithClaude } from '@/utils/claude-agent';
import { writeFile, unlink, readFile } from 'fs/promises';
import { uploadAudioToSupabase } from '@/utils/audio-storage';

// Increase route timeout for long-running podcast generation
export const maxDuration = 600; // 10 minutes
export const dynamic = 'force-dynamic';

/**
 * Generate TTS audio for a single script
 */
async function generateTTSForScript(
  script: string,
  outPath: string,
  apiKey: string,
  ttsUrl: string
): Promise<void> {
  // Split script into chunks if needed (OpenAI TTS limit is ~4096 chars)
  const maxChunkLength = 4000;
  const chunks: string[] = [];
  
  if (script.length <= maxChunkLength) {
    chunks.push(script);
  } else {
    let currentIndex = 0;
    while (currentIndex < script.length) {
      const remaining = script.length - currentIndex;
      const chunkSize = Math.min(maxChunkLength, remaining);
      let chunkEnd = currentIndex + chunkSize;
      
      // Try to break at sentence boundary
      if (chunkEnd < script.length) {
        const chunkText = script.substring(currentIndex, chunkEnd);
        const lastPeriod = chunkText.lastIndexOf('.');
        const lastExclamation = chunkText.lastIndexOf('!');
        const lastQuestion = chunkText.lastIndexOf('?');
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        if (lastSentenceEnd > chunkSize * 0.7) {
          chunkEnd = currentIndex + lastSentenceEnd + 1;
        }
      }
      
      chunks.push(script.substring(currentIndex, chunkEnd).trim());
      currentIndex = chunkEnd;
    }
  }
  
  // Generate TTS for each chunk
  const chunkAudioFiles: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkOutPath = `/tmp/chunk-${uuidv4()}.mp3`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
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
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI TTS API failed (${response.status}): ${errorText}`);
      }
      
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      await writeFile(chunkOutPath, audioBuffer);
      chunkAudioFiles.push(chunkOutPath);
      
      // Small delay between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Clean up partial chunks
      for (const f of chunkAudioFiles) await unlink(f).catch(() => {});
      throw error;
    }
  }
  
  // Concatenate chunks if multiple
  if (chunkAudioFiles.length === 1) {
    // Just copy the single chunk
    const audioBuffer = await readFile(chunkAudioFiles[0]);
    await writeFile(outPath, audioBuffer);
    await unlink(chunkAudioFiles[0]).catch(() => {});
  } else {
    // Concatenate using simple binary concatenation (works for MP3s)
    const audioBuffers = await Promise.all(chunkAudioFiles.map(f => readFile(f)));
    const concatenated = Buffer.concat(audioBuffers);
    await writeFile(outPath, concatenated);
    // Clean up chunk files
    for (const f of chunkAudioFiles) await unlink(f).catch(() => {});
  }
}

/**
 * Cron endpoint to generate daily podcast with 5 stories
 * 
 * This endpoint:
 * 1. Fetches 5 headlines using Claude
 * 2. Generates scripts for each story
 * 3. Generates audio for each story
 * 4. Uploads audio to Supabase Storage
 * 5. Saves episode and stories to database
 */
export async function GET(request: Request) {
  console.log('⏰ [CRON] Daily podcast generation job triggered');

  // Simple authorization check
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

  if (secret !== expectedSecret) {
    console.error('❌ [CRON] Unauthorized - invalid secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate required environment variables
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_TTS_URL = process.env.OPENAI_TTS_URL || 'https://api.openai.com/v1/audio/speech';

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ [CRON] ANTHROPIC_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!OPENAI_API_KEY) {
    console.error('❌ [CRON] OPENAI_API_KEY environment variable is required');
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    // Start background generation (fire-and-forget pattern)
    generateDailyPodcastInBackground(ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENAI_TTS_URL).catch(
      (error) => {
        console.error('❌ [CRON] Background podcast generation failed:', error);
      }
    );

    // Respond immediately
    return NextResponse.json({
      success: true,
      message: 'Daily podcast generation started in background',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [CRON] Error starting podcast generation:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start podcast generation',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Background function to generate daily podcast
 */
async function generateDailyPodcastInBackground(
  anthropicApiKey: string,
  openaiApiKey: string,
  ttsUrl: string
) {
  console.log('🔄 [BACKGROUND] Starting daily podcast generation...');
  const startTime = Date.now();

  try {
    const supabase = await createSupabaseClient();

    // Step 1: Fetch 5 headlines
    console.log('📰 [BACKGROUND] Fetching 5 headlines...');
    const headlines = await fetch5HeadlinesForPodcast();
    console.log(`✅ [BACKGROUND] Fetched ${headlines.length} headlines`);

    // Step 2: Generate scripts
    console.log('✍️ [BACKGROUND] Generating scripts...');
    const { scripts: storyScripts, fullScript } = await generateScriptsWithClaude(headlines);
    console.log(`✅ [BACKGROUND] Generated ${storyScripts.length} scripts`);

    // Step 3: Create episode record
    const episodeId = uuidv4();
    const episodeDate = new Date().toISOString().split('T')[0];
    const { error: episodeError } = await supabase.from('podcast_episodes').insert([
      {
        id: episodeId,
        title: `Daily Podcast - ${episodeDate}`,
        script: fullScript,
        status: 'generating',
        created_at: new Date().toISOString(),
      },
    ]);

    if (episodeError) {
      console.error('❌ [BACKGROUND] Episode insert error:', episodeError);
      throw episodeError;
    }

    // Step 4: Generate audio for each story and upload to Supabase Storage
    console.log('🎵 [BACKGROUND] Generating audio for stories...');
    const storyIds: string[] = [];
    const audioUrls: string[] = [];

    for (let i = 0; i < headlines.length; i++) {
      const headline = headlines[i];
      const script = storyScripts[i];
      const storyId = uuidv4();
      storyIds.push(storyId);

      console.log(`🎵 [BACKGROUND] Generating audio for story ${i + 1}/${headlines.length}...`);
      const audioFilePath = `/tmp/story-${storyId}.mp3`;
      
      try {
        await generateTTSForScript(script, audioFilePath, openaiApiKey, ttsUrl);
        console.log(`✅ [BACKGROUND] Audio generated for story ${i + 1}`);

        // Upload to Supabase Storage
        const audioUrl = await uploadAudioToSupabase(audioFilePath, storyId);
        audioUrls.push(audioUrl);

        // Clean up temp file
        await unlink(audioFilePath).catch(() => {});

        // Insert story record
        const { error: storyError } = await supabase.from('stories').insert([
          {
            id: storyId,
            episode_id: episodeId,
            headline,
            script,
            audio_url: audioUrl,
            order: i + 1,
            sources: null,
            quotes: null,
          },
        ]);

        if (storyError) {
          console.error(`❌ [BACKGROUND] Story ${i + 1} insert error:`, storyError);
        }

        // Small delay between stories
        if (i < headlines.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(`❌ [BACKGROUND] Error generating audio for story ${i + 1}:`, error);
        // Continue with other stories even if one fails
      }
    }

    // Step 5: Update episode status to complete
    const { error: updateError } = await supabase
      .from('podcast_episodes')
      .update({ status: 'complete' })
      .eq('id', episodeId);

    if (updateError) {
      console.error('❌ [BACKGROUND] Episode update error:', updateError);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`🎉 [BACKGROUND] Daily podcast generation completed in ${duration}s`);
    console.log(`📊 [BACKGROUND] Generated ${audioUrls.length} audio files`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [BACKGROUND] Error generating daily podcast:', errorMessage);
    throw error;
  }
}

/**
 * Also support POST for cron services that use POST
 */
export async function POST(request: Request) {
  return GET(request);
}
