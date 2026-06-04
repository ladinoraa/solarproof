import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const MAX_PAGE_SIZE = 100

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  cursor: z.string().optional(),
  q: z.string().trim().default(''),
  status: z.enum(['active', 'retired']).nullable().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

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
  const queryParams = Object.fromEntries(searchParams.entries())
  const parsedQuery = QuerySchema.safeParse(queryParams)

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 })
  }

  const { limit, cursor, q, status, date_from: dateFrom, date_to: dateTo } = parsedQuery.data

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
