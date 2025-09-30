import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { email, episodeId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Record the generation
    const { error } = await supabase
      .from('user_generations')
      .insert({
        id: uuidv4(),
        email: email,
        generation_date: today,
        episode_id: episodeId,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Record generation error:', error);
      return NextResponse.json({ error: 'Failed to record generation' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Generation recorded successfully'
    });

  } catch (error) {
    console.error('Record generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 