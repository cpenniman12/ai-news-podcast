import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type SupabaseConfig = {
  url: string
  anonKey: string
}

const isPlaceholder = (value?: string) =>
  !value ||
  value === 'your_supabase_url_here' ||
  value === 'your_supabase_anon_key_here'

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  if (isPlaceholder(url) || isPlaceholder(anonKey) || !url?.startsWith('https://')) {
    return null
  }

  return { url, anonKey }
}

export async function createClient() {
  const config = getSupabaseConfig()

  if (!config) {
    throw new Error(
      'Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_ANON_KEY.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}