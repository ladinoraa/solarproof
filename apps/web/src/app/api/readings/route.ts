import { NextRequest, NextResponse } from 'next/server'
import { verifyAsync } from '@noble/ed25519'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { computeReadingHash } from '@/lib/crypto'
import { kwhToStroops } from '@solarproof/stellar'
import { anchorReading, mintCertificates } from '@/lib/stellar'
import { invalidateCert } from '@/lib/cache'
import { fireWebhook } from '@/lib/webhooks'
import { logger } from '@/lib/logger'
import { getIdempotentResponse, storeIdempotentResponse } from '@/lib/idempotency'

const MAX_PAGE_SIZE = 100

/**
 * GET /api/v1/readings
 *
 * Cursor-based pagination via `cursor` (ISO timestamp) and `limit` (max 100).
 * Returns `{ data, next_cursor, total }`.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), MAX_PAGE_SIZE)
  const cursor = searchParams.get('cursor') // ISO timestamp of last seen row

  const db = createServiceClient()

  // Total count (for UI pagination)
  const { count } = await db
    .from('readings')
    .select('id', { count: 'exact', head: true })

  let query = db
    .from('readings')
    .select('id, meter_id, kwh, timestamp, reading_hash, anchored, minted, anchor_tx_hash, mint_tx_hash')
    .order('timestamp', { ascending: false })
    .limit(limit + 1) // fetch one extra to determine if there's a next page

  if (cursor) {
    query = query.lt('timestamp', cursor)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const next_cursor = hasMore ? page[page.length - 1].timestamp : null

  return NextResponse.json({ data: page, next_cursor, total: count ?? 0 })
}

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
  nonce: z.string().min(1).max(128).optional(),
})

/**
 * POST /api/readings
 *
 * Verifies the Ed25519 signature, persists the reading, anchors on Stellar,
 * and mints a certificate.
 *
 * Supports idempotency via the `Idempotency-Key` header (UUID recommended).
 * Duplicate requests with the same key return the cached response without
 * re-processing. Keys expire after IDEMPOTENCY_TTL_SECONDS (default 24 h).
 *
 * Returns 201 Created with { reading_id, anchor_tx_hash, mint_tx_hash }.
 */
export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') ?? undefined
  const log = correlationId ? logger.withCorrelationId(correlationId) : logger

  // Idempotency-Key header check
  const idempotencyKey = req.headers.get('idempotency-key')
  if (idempotencyKey) {
    const cached = await getIdempotentResponse(idempotencyKey)
    if (cached) {
      log.info('readings.post.idempotent_hit', { idempotencyKey })
      return NextResponse.json(cached.body, { status: cached.status })
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = ReadingSchema.safeParse(body)
  if (!parsed.success) {
    log.warn('readings.post.invalid_body', { errors: parsed.error.flatten() })
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
    .single() as { data: { id: string; pubkey_hex: string; cooperative_id: string; cooperatives: { admin_address: string } | null } | null }

  if (!meter) {
    log.warn('readings.post.meter_not_found', { meter_id })
    return NextResponse.json({ error: 'Meter not found or inactive' }, { status: 404 })
  }

  // Compute canonical reading hash
  const kwhStroops = kwhToStroops(kwh)
  const readingHash = computeReadingHash(meter_id, kwhStroops, BigInt(timestamp))

  // Verify Ed25519 signature
  const sigValid = await verifyAsync(
    Buffer.from(signature_hex, 'hex'),
    readingHash,
    Buffer.from(meter.pubkey_hex, 'hex')
  ).catch(() => false)

  if (!sigValid) {
    log.warn('readings.post.invalid_signature', { meter_id })
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
    log.error('readings.post.db_insert_failed', { meter_id, error: readingErr?.message })
    return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 })
  }

  // Anchor on-chain (hash only — full payload already in Supabase)
  let anchorTxHash: string
  try {
    anchorTxHash = await anchorReading({ readingHash })
    await db.from('readings').update({ anchored: true, anchor_tx_hash: anchorTxHash }).eq('id', reading.id)
    log.info('readings.post.anchored', { reading_id: reading.id, anchor_tx_hash: anchorTxHash })
    void fireWebhook(meter.cooperative_id, 'anchor', { reading_id: reading.id, anchor_tx_hash: anchorTxHash })
  } catch (err) {
    if (isAlreadyAnchoredError(err)) {
      log.warn('readings.post.already_anchored', { reading_id: reading.id })
      return NextResponse.json({ error: 'Reading already anchored', reading_id: reading.id }, { status: 409 })
    }
    const message = extractErrorMessage(err)
    log.error('readings.post.anchor_failed', { reading_id: reading.id, error: message })
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

    log.info('readings.post.minted', { reading_id: reading.id, mint_tx_hash: mintTxHash, kwh })
    void fireWebhook(meter.cooperative_id, 'mint', { reading_id: reading.id, mint_tx_hash: mintTxHash, kwh })

    const responseBody = { reading_id: reading.id, anchor_tx_hash: anchorTxHash, mint_tx_hash: mintTxHash }
    if (idempotencyKey) {
      await storeIdempotentResponse(idempotencyKey, { body: responseBody, status: 201 })
    }
    return NextResponse.json(responseBody, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mint failed'
    log.error('readings.post.mint_failed', { reading_id: reading.id, error: message })
    return NextResponse.json({ error: message, reading_id: reading.id, anchor_tx_hash: anchorTxHash }, { status: 500 })
  }
}
