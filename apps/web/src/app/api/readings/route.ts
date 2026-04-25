import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@noble/ed25519'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { anchorReading, mintCertificates } from '@/lib/stellar'
import { computeReadingHash } from '@/lib/crypto'
import { kwhToStroops } from '@solarproof/stellar'
import { invalidateCert } from '@/lib/cache'
import { auditLog } from '@/lib/audit'

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

function isAlreadyAnchoredError(err: unknown): boolean {
  const message = extractErrorMessage(err).toLowerCase()
  return message.includes('alreadyanchored') || message.includes('reading already anchored') || message.includes('duplicate')
}

const ReadingSchema = z.object({
  meter_id: z.string().uuid(),
  kwh: z.number().positive(),
  timestamp: z.number().int().positive(), // Unix seconds
  signature_hex: z.string().length(128),  // 64-byte Ed25519 sig as hex
})

/**
 * POST /api/readings
 *
 * Accepts a signed meter reading, verifies the Ed25519 signature,
 * anchors the reading hash on-chain, then mints certificates.
 *
 * Body: { meter_id, kwh, timestamp, signature_hex }
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

  // Persist reading
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

  // Anchor on-chain (hash only — full payload already in Supabase)
  let anchorTxHash: string
  try {
    anchorTxHash = await anchorReading({ readingHash })
    await db.from('readings').update({ anchored: true, anchor_tx_hash: anchorTxHash }).eq('id', reading.id)
  } catch (err) {
    if (isAlreadyAnchoredError(err)) {
      return NextResponse.json({ error: 'Reading already anchored', reading_id: reading.id }, { status: 409 })
    }
    const message = extractErrorMessage(err)
    return NextResponse.json({ error: message, reading_id: reading.id }, { status: 500 })
  }

  // Mint certificates
  try {
    const cooperative = meter.cooperatives as { admin_address: string } | null
    const recipient = cooperative?.admin_address
    if (!recipient) throw new Error('No cooperative admin address')

    const mintTxHash = await mintCertificates(recipient, kwh)
    await db.from('readings').update({ minted: true, mint_tx_hash: mintTxHash }).eq('id', reading.id)
    await db.from('certificates').insert({
      cooperative_id: meter.cooperative_id,
      reading_id: reading.id,
      reading_hash: readingHash.toString('hex'),
      anchor_tx_hash: anchorTxHash,
      mint_tx_hash: mintTxHash,
      kwh,
      issued_at: new Date().toISOString(),
      retired: false,
    })

    // Invalidate any stale cache entries for this certificate
    await invalidateCert(reading.id, readingHash.toString('hex'), mintTxHash)

    await auditLog(req, {
      operator_id: meter_id,
      action: 'reading.create',
      resource_id: reading.id,
      metadata: { kwh, anchor_tx_hash: anchorTxHash, mint_tx_hash: mintTxHash },
    })

    return NextResponse.json({ reading_id: reading.id, anchor_tx_hash: anchorTxHash, mint_tx_hash: mintTxHash }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mint failed'
    return NextResponse.json({ error: message, reading_id: reading.id, anchor_tx_hash: anchorTxHash }, { status: 500 })
  }
}
