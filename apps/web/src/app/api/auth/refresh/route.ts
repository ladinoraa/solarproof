import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { env } from '@/env'

const RefreshSchema = z.object({ refresh_token: z.string().min(1) })

/** POST /api/auth/refresh — rotate refresh token and return new token pair */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = RefreshSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  })

  if (error || !data.session) {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: 'Bearer',
  })
}
