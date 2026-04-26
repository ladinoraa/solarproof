import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from './database.types'
import { env } from '@/env'

/** Create a Supabase client that validates the caller's JWT (anon key, RLS enforced). */
export function createUserClient(accessToken: string) {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    }
  )
}

/** Extract and validate the Bearer JWT from the Authorization header.
 *  Returns the authenticated Supabase user, or a 401 NextResponse on failure. */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: { id: string; email?: string }; accessToken: string } | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const client = createUserClient(accessToken)
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return { user: { id: data.user.id, email: data.user.email }, accessToken }
}

/** Type guard: true when requireAuth returned a NextResponse (i.e. auth failed). */
export function isAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}
