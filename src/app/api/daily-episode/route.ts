import { NextResponse } from 'next/server';
import { getDailyEpisode, getLatestEpisode } from '@/utils/supabase/storage';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    let episode;
    
    if (date) {
      console.log(`🔍 [API] Fetching episode for specific date: ${date}`);
      episode = await getDailyEpisode(date);
    } else {
      console.log('🔍 [API] Fetching latest available episode');
      episode = await getLatestEpisode();
      
      // If no episode found, try today's date
      if (!episode) {
        const today = new Date().toISOString().split('T')[0];
        console.log(`🔍 [API] No latest episode found, trying today: ${today}`);
        episode = await getDailyEpisode(today);
      }
    }
    
    if (!episode) {
      console.log('📭 [API] No episode found');
      return NextResponse.json(
        { 
          error: 'No episode available',
          message: 'No daily episode found for the requested date. Episodes are generated daily at 6 AM ET.'
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ [API] Found episode for ${episode.episode_date}`);
    
    // Return episode data
    return NextResponse.json({
      episode,
      message: 'Episode found',
      cached: true
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error fetching daily episode:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily episode',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}