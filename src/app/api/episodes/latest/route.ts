import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Get the latest complete podcast episode with all stories
 */
export async function GET() {
  console.log('📻 [API] Fetching latest episode...');

  try {
    const supabase = await createSupabaseClient();

    // Get the latest episode with status 'complete', ordered by created_at
    const { data: episode, error: episodeError } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError) {
      console.error('❌ [API] Error fetching episode:', episodeError);
      return NextResponse.json(
        { error: 'Failed to fetch latest episode', details: episodeError.message },
        { status: 500 }
      );
    }

    if (!episode) {
      console.log('ℹ️ [API] No complete episode found');
      return NextResponse.json(
        { error: 'No episode available', message: 'No podcast has been generated yet. Please check back later.' },
        { status: 404 }
      );
    }

    // Get all stories for this episode, ordered by order field
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('episode_id', episode.id)
      .order('order', { ascending: true });

    if (storiesError) {
      console.error('❌ [API] Error fetching stories:', storiesError);
      return NextResponse.json(
        { error: 'Failed to fetch stories', details: storiesError.message },
        { status: 500 }
      );
    }

    if (!stories || stories.length === 0) {
      console.log('ℹ️ [API] No stories found for episode');
      return NextResponse.json(
        { error: 'No stories available', message: 'Episode exists but has no stories.' },
        { status: 404 }
      );
    }

    console.log(`✅ [API] Found episode with ${stories.length} stories`);

    return NextResponse.json({
      episode: {
        id: episode.id,
        title: episode.title,
        created_at: episode.created_at,
      },
      stories: stories.map((story) => ({
        id: story.id,
        headline: story.headline,
        script: story.script,
        audio_url: story.audio_url,
        order: story.order,
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [API] Error in latest episode endpoint:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch latest episode', details: errorMessage },
      { status: 500 }
    );
  }
}
