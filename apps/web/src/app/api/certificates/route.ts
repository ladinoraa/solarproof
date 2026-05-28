import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MAX_PAGE_SIZE = 100

/**
 * GET /api/v1/certificates
 *
 * Cursor-based pagination via `cursor` (ISO timestamp of `issued_at`) and
 * `limit` (max 100). Returns `{ data, next_cursor, total }`.
 *
 * Filter params:
 *   q          — prefix search on certificate id or meter_id (via readings join)
 *   status     — "active" | "retired"
 *   date_from  — ISO date string (inclusive lower bound on issued_at)
 *   date_to    — ISO date string (inclusive upper bound on issued_at)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), MAX_PAGE_SIZE)
  const cursor = searchParams.get('cursor')
  const q = searchParams.get('q')?.trim() ?? ''
  const status = searchParams.get('status') // "active" | "retired" | null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const db = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('certificates')
    .select(
      'id, kwh, issued_at, retired, retired_at, retired_by, mint_tx_hash, readings!inner(meter_id)',
      { count: 'exact' }
    )
    .order('issued_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('issued_at', cursor)
  if (status === 'active') query = query.eq('retired', false)
  if (status === 'retired') query = query.eq('retired', true)
  if (dateFrom) query = query.gte('issued_at', dateFrom)
  if (dateTo) query = query.lte('issued_at', dateTo + 'T23:59:59.999Z')

  // Text search: match cert id prefix OR meter_id prefix via the joined reading
  if (q) {
    query = query.or(`id.ilike.${q}%,readings.meter_id.ilike.${q}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Array<{
    id: string
    kwh: number
    issued_at: string
    retired: boolean
    retired_at: string | null
    retired_by: string | null
    mint_tx_hash: string | null
    readings: { meter_id: string } | { meter_id: string }[]
  }>

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const next_cursor = hasMore ? page[page.length - 1].issued_at : null

  // Flatten the joined meter_id onto each row
  const normalized = page.map(({ readings, ...cert }) => ({
    ...cert,
    meter_id: Array.isArray(readings) ? readings[0]?.meter_id : readings?.meter_id ?? null,
  }))

  return NextResponse.json({ data: normalized, next_cursor, total: count ?? 0 })
}
