import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if we have valid Supabase credentials (not placeholders)
  if (!supabaseUrl || 
      !supabaseAnonKey || 
      supabaseUrl === 'your_supabase_url_here' ||
      supabaseAnonKey === 'your_supabase_anon_key_here' ||
      !supabaseUrl.startsWith('https://')) {
    console.warn('🔧 Supabase credentials not configured. Authentication features will be disabled.');
    console.warn('   To enable authentication, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    return null;
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    return null;
  }
} 