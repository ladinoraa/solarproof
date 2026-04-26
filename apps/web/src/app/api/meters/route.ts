import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth, isAuthError } from '@/lib/auth'

const RegisterSchema = z.object({
  cooperative_id: z.string().uuid(),
  serial_number: z.string().min(1).max(64),
  pubkey_hex: z.string().length(64),
})

/** GET /api/meters — list all meters (requires operator JWT) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const db = createServiceClient()
  const { data, error } = await db
    .from('meters')
    .select('id, serial_number, pubkey_hex, active, created_at, cooperative_id')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** POST /api/meters — register a new meter (requires operator JWT) */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('meters')
    .insert({ ...parsed.data, active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
