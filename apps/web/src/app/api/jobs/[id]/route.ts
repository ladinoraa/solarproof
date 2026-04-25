import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/** GET /api/jobs/[id] — query job status */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServiceClient()

  const { data, error } = await db
    .from('jobs')
    .select('id, type, status, attempts, result, error, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json(data)
}
