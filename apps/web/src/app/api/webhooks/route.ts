import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const VALID_EVENTS = ['anchor', 'mint', 'retire'] as const

const WebhookSchema = z.object({
  cooperative_id: z.string().uuid(),
  url: z.string().url(),
  secret: z.string().min(16),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
})

/**
 * POST /api/webhooks
 *
 * Register a webhook endpoint for a cooperative.
 * Body: { cooperative_id, url, secret, events }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = WebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('webhook_endpoints')
    .insert(parsed.data)
    .select('id, cooperative_id, url, events, active, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
