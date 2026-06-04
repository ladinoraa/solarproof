import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth, isAuthError } from '@/lib/auth'

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(128),
  serial_number: z.string().trim().min(1).max(64),
  pubkey_hex: z.string().trim().length(64),
  meter_group: z.string().trim().max(64).optional().nullable(),
  tags: z.array(z.string().trim().max(32)).optional().default([]),
})

/** Generate a unique meter API key: "mk_" + 32 random bytes as hex. */
function generateApiKey(): string {
  return 'mk_' + randomBytes(32).toString('hex')
}

/** GET /api/meters — list all meters (requires operator JWT) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const db = createServiceClient()
  const { data, error } = await db
    .from('meters')
    .select('id, name, serial_number, pubkey_hex, active, created_at, cooperative_id, meter_group, tags')
    .eq('cooperative_id', auth.cooperativeId)
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

  // Fetch cooperative account type and current meter count
  const [{ data: coop }, { count: meterCount }] = await Promise.all([
    db.from('cooperatives').select('account_type').eq('id', auth.cooperativeId).single(),
    db.from('meters').select('id', { count: 'exact', head: true }).eq('cooperative_id', auth.cooperativeId),
  ])

  if (!coop) {
    return NextResponse.json({ error: 'Cooperative not found' }, { status: 404 })
  }

  // Enforce 1-meter limit for individual accounts
  if (coop.account_type === 'individual' && (meterCount ?? 0) >= 1) {
    return NextResponse.json(
      { error: 'Individual accounts are limited to 1 meter. Please upgrade to a Cooperative account for multi-meter management.' },
      { status: 403 }
    )
  }

  // Check for duplicate public key
  const { data: existing } = await db
    .from('meters')
    .select('id')
    .eq('pubkey_hex', parsed.data.pubkey_hex)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A meter with this public key already exists' }, { status: 409 })
  }

  const { data, error } = await db
    .from('meters')
    .insert({
      ...parsed.data,
      cooperative_id: auth.cooperativeId,
      active: true,
      api_key: generateApiKey(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Return full row including api_key — only shown once at registration
  return NextResponse.json(data, { status: 201 })
}
