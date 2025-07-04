import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if 'next' is in param, use it or default to '/'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // URL to redirect to after successful auth exchange
      const redirectUrl = `${origin}${next}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Return the user to an error page with instructions
  console.error('Error exchanging code for session or missing code')
  const redirectUrl = `${origin}/auth/auth-code-error`
  return NextResponse.redirect(redirectUrl)
} 