import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@noble/ed25519'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { computeReadingHash } from '@/lib/crypto'
import { kwhToStroops } from '@solarproof/stellar'
import { enqueue } from '@/lib/queue'

const ReadingSchema = z.object({
  meter_id: z.string().uuid(),
  kwh: z.number().positive(),
  timestamp: z.number().int().positive(), // Unix seconds
  signature_hex: z.string().length(128),  // 64-byte Ed25519 sig as hex
})

/**
 * POST /api/readings
 *
 * Verifies the Ed25519 signature, persists the reading, then enqueues
 * the Stellar anchor + mint as an async job.
 *
 * Returns 202 Accepted immediately with { reading_id, job_id }.
 * Poll GET /api/jobs/[job_id] for completion status.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = ReadingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { meter_id, kwh, timestamp, signature_hex } = parsed.data
  const db = createServiceClient()

  // Fetch meter + cooperative
  const { data: meter } = await db
    .from('meters')
    .select('id, pubkey_hex, cooperative_id, cooperatives(admin_address)')
    .eq('id', meter_id)
    .eq('active', true)
    .single()

  if (!meter) {
    return NextResponse.json({ error: 'Meter not found or inactive' }, { status: 404 })
  }

  // Compute canonical reading hash
  const kwhStroops = kwhToStroops(kwh)
  const readingHash = computeReadingHash(meter_id, kwhStroops, BigInt(timestamp))

  // Verify Ed25519 signature
  const sigValid = await verify(
    Buffer.from(signature_hex, 'hex'),
    readingHash,
    Buffer.from(meter.pubkey_hex, 'hex')
  ).catch(() => false)

  if (!sigValid) {
    return NextResponse.json({ error: 'Invalid meter signature' }, { status: 401 })
  }

  // Persist reading (anchored/minted will be updated by the background job)
  const { data: reading, error: readingErr } = await db
    .from('readings')
    .insert({
      meter_id,
      kwh,
      timestamp: new Date(timestamp * 1000).toISOString(),
      reading_hash: readingHash.toString('hex'),
      signature_hex,
      anchored: false,
      minted: false,
    })
    .select()
    .single()

  if (readingErr || !reading) {
    return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 })
  }

  // Enqueue Stellar anchor + mint — returns immediately
  const cooperative = meter.cooperatives as { admin_address: string } | null
  const correlationId = crypto.randomUUID()
  const jobId = await enqueue('anchor_and_mint', {
    readingId: reading.id,
    readingHashHex: readingHash.toString('hex'),
    recipientAddress: cooperative?.admin_address ?? '',
    kwh,
    correlationId,
  })

  return NextResponse.json(
    { reading_id: reading.id, job_id: jobId, status_url: `/api/jobs/${jobId}` },
    { status: 202 }
  )
}
