import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  operator_id: z.string().trim().optional(),
})

/**
 * GET /api/audit-log?from=ISO&to=ISO&operator_id=...
 *
 * Returns audit log entries as CSV for compliance export.
 * Query params are all optional; defaults to last 30 days.
 */
export async function GET(req: NextRequest) {
  const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(queryParams)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const from = parsed.data.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString()
  const to = parsed.data.to ?? new Date().toISOString()
  const operatorId = parsed.data.operator_id

  const db = createServiceClient()
  let query = db
    .from('audit_log')
    .select('id,operator_id,action,resource_id,ip_address,metadata,created_at')
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true })

  if (operatorId) query = query.eq('operator_id', operatorId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const header = 'id,operator_id,action,resource_id,ip_address,metadata,created_at\n'
  const rows = (data ?? []).map(r =>
    [r.id, r.operator_id, r.action, r.resource_id ?? '', r.ip_address ?? '',
     JSON.stringify(r.metadata ?? {}), r.created_at]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n')

  return new NextResponse(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit_log_${from.slice(0, 10)}_${to.slice(0, 10)}.csv"`,
    },
  })
}
