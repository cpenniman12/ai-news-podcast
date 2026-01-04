import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { generateScriptsWithClaude } from '@/utils/claude-agent';

// Increase route timeout for long-running script generation
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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

  console.log('🎙️ [API] Detailed script generation API called (using Claude)');
  
  try {
    const { headlines } = await req.json();
    
    if (!Array.isArray(headlines) || headlines.length === 0) {
      console.log('❌ [API] No headlines provided');
      return NextResponse.json({ error: 'No headlines provided' }, { status: 400 });
    }

    console.log(`📰 [API] Processing ${headlines.length} headlines for detailed script generation`);
    
    // Generate scripts using Claude
    const { scripts: storyScripts, fullScript } = await generateScriptsWithClaude(headlines);
    
    // --- Supabase Storage Integration ---
    try {
      const supabase = await createSupabaseClient();
      // Insert podcast episode
      const { data: episodeData, error: episodeError } = await supabase
        .from('podcast_episodes')
        .insert([
          {
            id: uuidv4(),
            title: `Podcast - ${new Date().toISOString()}`,
            script: fullScript,
            status: 'complete',
          },
        ])
        .select()
        .single();
      if (episodeError) {
        console.error('Supabase episode insert error:', episodeError);
      }
      const episodeId = episodeData?.id;
      // Insert stories
      for (let i = 0; i < headlines.length; i++) {
        const headline = headlines[i];
        const script = storyScripts[i];
        await supabase.from('stories').insert([
          {
            episode_id: episodeId,
            headline,
            script,
            order: i + 1,
            sources: null, // Optionally add research sources if available
            quotes: null,  // Optionally extract and add quotes if available
          },
        ]);
      }
    } catch (err) {
      console.error('Supabase storage error:', err);
    }
    // --- End Supabase Storage ---
    
    console.log(`🎉 [API] Complete podcast script generated!`);
    console.log(`📊 [API] Total script length: ${fullScript.length} characters`);
    console.log(`⏱️ [API] Estimated reading time: ${Math.round(fullScript.length / 1000 * 3)} minutes`);
    
    return NextResponse.json({ 
      script: fullScript,
      scripts: storyScripts,
      stats: {
        storiesProcessed: headlines.length,
        scriptLength: fullScript.length,
        estimatedDuration: Math.round(fullScript.length / 1000 * 3)
      }
    });

  } catch (error) {
    console.error('❌ [API] Error in detailed script generation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate detailed podcast script' 
    }, { status: 500 });
  }
}
