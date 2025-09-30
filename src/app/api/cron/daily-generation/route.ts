import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('⏰ [Cron] Daily podcast generation triggered at 6 AM ET');
    
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ [Cron] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 [Cron] Generating episode for ${today}`);
    
    // Call the daily podcast generation API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-app.vercel.app';
    const response = await fetch(`${baseUrl}/api/generate-daily-podcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: today }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [Cron] Daily generation failed:', errorData);
      return NextResponse.json(
        { error: 'Daily generation failed', details: errorData },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    console.log('✅ [Cron] Daily generation completed successfully');
    
    return NextResponse.json({
      message: 'Daily podcast generated successfully',
      date: today,
      episode: data.episode,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('💥 [Cron] Error in daily generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}