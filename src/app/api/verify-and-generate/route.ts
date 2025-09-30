import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const ADMIN_EMAIL = 'cooperpenniman@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { email, headlines, isRetryAfterVerification } = await req.json();

    if (!email || !headlines || !Array.isArray(headlines) || headlines.length === 0) {
      return NextResponse.json({ error: 'Email and headlines are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Admin bypass check - always allow admin
    if (email === ADMIN_EMAIL) {
      return NextResponse.json({ 
        canGenerate: true,
        isAdmin: true,
        message: 'Admin access granted'
      });
    }

    const supabase = await createClient();

    // If this is a retry after verification, check if user is now verified
    if (isRetryAfterVerification) {
      // For non-admin users, we'll try to get the current session to check verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || session.user.email !== email) {
        return NextResponse.json({ 
          requiresVerification: true,
          message: 'Please verify your email address first'
        }, { status: 202 });
      }

      // User has valid session, check if email is verified
      if (!session.user.email_confirmed_at) {
        return NextResponse.json({ 
          requiresVerification: true,
          message: 'Please complete email verification'
        }, { status: 202 });
      }
    } else {
      // First attempt - always require verification for non-admin users
      return NextResponse.json({ 
        requiresVerification: true,
        message: 'Please verify your email address first'
      }, { status: 202 });
    }

    // Check rate limiting for verified users
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { data: generations, error: genError } = await supabase
      .from('user_generations')
      .select('*')
      .eq('email', email)
      .eq('generation_date', today);

    if (genError) {
      console.error('Generation check error:', genError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (generations && generations.length > 0) {
      const lastGeneration = generations[0];
      const timeUntilNext = new Date(lastGeneration.created_at);
      timeUntilNext.setDate(timeUntilNext.getDate() + 1);
      
      return NextResponse.json({ 
        rateLimited: true,
        message: 'You can only generate one podcast per day',
        nextAvailable: timeUntilNext.toISOString()
      }, { status: 429 });
    }

    // User is verified and can generate
    return NextResponse.json({ 
      canGenerate: true,
      isAdmin: false,
      message: 'Ready to generate podcast'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 