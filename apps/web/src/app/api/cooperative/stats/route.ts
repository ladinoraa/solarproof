import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth, isAuthError } from '@/lib/auth'

/**
 * GET /api/cooperative/stats
 * Returns cooperative-level stats: total kWh anchored, total certificates, active meters.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const db = createServiceClient()

  // For total kWh, we sum readings from all meters in this cooperative
  const [readingsResult, issuedResult, retiredResult, meterResult] = await Promise.all([
    db.rpc('sum_cooperative_kwh', { target_cooperative_id: auth.cooperativeId }),
    db.from('certificates').select('id', { count: 'exact', head: true }).eq('cooperative_id', auth.cooperativeId).eq('retired', false),
    db.from('certificates').select('id', { count: 'exact', head: true }).eq('cooperative_id', auth.cooperativeId).eq('retired', true),
    db.from('meters').select('id', { count: 'exact', head: true }).eq('cooperative_id', auth.cooperativeId).eq('active', true),
  ])

  // If RPC is missing, we fallback to a manual sum (inefficient but safe)
  let total_kwh = readingsResult.data
  if (readingsResult.error) {
    // Better: manual query with join
    const { data: joinData } = await db
      .from('readings')
      .select('kwh, meters!inner(cooperative_id)')
      .eq('meters.cooperative_id', auth.cooperativeId)
      .eq('anchored', true)
    
    total_kwh = (joinData ?? []).reduce((sum, r) => sum + Number(r.kwh), 0)
  }

  return NextResponse.json({
    total_kwh: Math.round((total_kwh ?? 0) * 1000) / 1000,
    certificates_issued: (issuedResult.count ?? 0) + (retiredResult.count ?? 0),
    certificates_retired: retiredResult.count ?? 0,
    active_meters: meterResult.count ?? 0,
  })
}
