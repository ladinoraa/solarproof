import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const MAX_PAGE_SIZE = 100

/**
 * GET /api/v1/certificates
 *
 * Cursor-based pagination via `cursor` (ISO timestamp of `issued_at`) and
 * `limit` (max 100). Returns `{ data, next_cursor, total }`.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), MAX_PAGE_SIZE)
  const cursor = searchParams.get('cursor') // ISO timestamp of last seen row

  const db = createServiceClient()

  const { count } = await db
    .from('certificates')
    .select('id', { count: 'exact', head: true })

  let query = db
    .from('certificates')
    .select('id, kwh, issued_at, retired, retired_at, retired_by, mint_tx_hash')
    .order('issued_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('issued_at', cursor)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const next_cursor = hasMore ? page[page.length - 1].issued_at : null

  return NextResponse.json({ data: page, next_cursor, total: count ?? 0 })
}
