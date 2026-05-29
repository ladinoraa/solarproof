import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const checks: Record<string, boolean> = {}

  // DB check
  try {
    const db = createServiceClient()
    const { error } = await db.from('meters').select('id').limit(1)
    checks.db = !error
  } catch {
    checks.db = false
  }

  const healthy = Object.values(checks).every(Boolean)
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
