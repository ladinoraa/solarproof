import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * GET /api/verify?id=<certificate_id_or_reading_hash_or_tx_hash>
 *
 * Public endpoint — no auth required.
 * Returns the full chain of custody for a certificate.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
  }

  const db = createServiceClient()

  // Try certificate ID first, then reading_hash, then mint_tx_hash
  const { data: cert } = await db
    .from('certificates')
    .select('*')
    .or(`id.eq.${id},reading_hash.eq.${id},mint_tx_hash.eq.${id}`)
    .single()

  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // Fetch the associated reading for full audit trail
  const { data: reading } = await db
    .from('readings')
    .select('*')
    .eq('id', cert.reading_id)
    .single()

  const chain = {
    certificate: {
      id: cert.id,
      kwh: cert.kwh,
      issued_at: cert.issued_at,
      retired: cert.retired,
      retired_at: cert.retired_at,
      retired_by: cert.retired_by,
    },
    on_chain: {
      anchor_tx: cert.anchor_tx_hash,
      anchor_explorer: `https://stellar.expert/explorer/testnet/tx/${cert.anchor_tx_hash}`,
      mint_tx: cert.mint_tx_hash,
      mint_explorer: `https://stellar.expert/explorer/testnet/tx/${cert.mint_tx_hash}`,
    },
    meter_proof: reading
      ? {
          meter_id: reading.meter_id,
          reading_hash: reading.reading_hash,
          signature_hex: reading.signature_hex,
          kwh: reading.kwh,
          timestamp: reading.timestamp,
          verified: true,
        }
      : null,
  }

  return NextResponse.json(chain)
}
