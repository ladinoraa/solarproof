import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth, isAuthError } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/meters/:id — retrieve a single meter (requires operator JWT).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const db = createServiceClient()

  const { data, error } = await db
    .from('meters')
    .select('id, serial_number, pubkey_hex, active, created_at, cooperative_id')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/meters/:id — deactivate a meter (requires operator JWT).
 *
 * Soft-deletes by setting active=false rather than removing the row so
 * historical readings remain linked.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const { id } = await params
  const db = createServiceClient()

  const { data, error } = await db
    .from('meters')
    .update({ active: false })
    .eq('id', id)
    .select('id, active')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
  return NextResponse.json(data)
}
