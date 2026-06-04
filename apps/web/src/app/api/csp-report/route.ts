import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CspSchema = z.object({
  'csp-report': z.record(z.unknown()).optional(),
}).passthrough()

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = CspSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 })
  }

  console.warn('[CSP Violation]', JSON.stringify(parsed.data))
  return NextResponse.json({}, { status: 204 })
}
