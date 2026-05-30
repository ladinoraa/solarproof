import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const CertificatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['active', 'retired']).optional(),
  meterId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const parsed = CertificatesQuerySchema.parse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    status: searchParams.get('status') || undefined,
    meterId: searchParams.get('meterId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  })

  const db = createServiceClient()
  let query = db
    .from('certificates')
    .select('*, readings!inner(meter_id)', { count: 'exact' })

  if (parsed.status === 'active') {
    query = query.eq('retired', false)
  }

  if (parsed.status === 'retired') {
    query = query.eq('retired', true)
  }

  if (parsed.startDate) {
    query = query.gte('issued_at', parsed.startDate)
  }

  if (parsed.endDate) {
    query = query.lte('issued_at', parsed.endDate)
  }

  if (parsed.meterId) {
    query = query.eq('readings.meter_id', parsed.meterId)
  }

  const start = (parsed.page - 1) * parsed.pageSize
  const end = parsed.page * parsed.pageSize - 1
  const { data, count, error } = await query.range(start, end)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const certificates = (data ?? []).map((certificate: any) => ({
    ...certificate,
    meter_id: certificate.readings?.meter_id ?? null,
  }))

  return NextResponse.json({
    certificates,
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  })
}
