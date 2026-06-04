import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const QuerySchema = z.object({
  endpoint_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * GET /api/webhooks/logs?endpoint_id=UUID&limit=50
 *
 * Returns webhook delivery log entries for a given endpoint.
 * Ordered by most recent first.
 */
export async function GET(req: NextRequest) {
  const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(queryParams)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { endpoint_id: endpointId, limit } = parsed.data

  const db = createServiceClient()
  const { data, error } = await db
    .from('webhook_logs')
    .select('id, endpoint_id, event, status, attempts, response_status, created_at')
    .eq('endpoint_id', endpointId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
