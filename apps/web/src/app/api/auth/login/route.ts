import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/env'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

/** POST /api/auth/login — exchange email+password for access + refresh tokens */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.session) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: 'Bearer',
  })
}
