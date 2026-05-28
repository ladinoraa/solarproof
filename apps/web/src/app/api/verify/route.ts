import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getCachedCert, setCachedCert } from '@/lib/cache'
import { stellarExplorerUrl, type NetworkName } from '@solarproof/stellar'
import { env } from '@/env'

/**
 * GET /api/verify?id=<certificate_id_or_reading_hash_or_tx_hash>
 *
 * Public endpoint — no auth required.
 * Returns the full chain of custody for a certificate.
 * Results are cached in Redis for 60 s (TTL defined in cache.ts).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
  }

  // Cache lookup
  const cached = await getCachedCert<unknown>(id)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
        'X-Cache': 'HIT',
      },
    })
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

  const network = (env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as NetworkName

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
      anchor_explorer: stellarExplorerUrl('tx', cert.anchor_tx_hash, network),
      mint_tx: cert.mint_tx_hash,
      mint_explorer: stellarExplorerUrl('tx', cert.mint_tx_hash, network),
      energy_token_id: env.NEXT_PUBLIC_ENERGY_TOKEN_ID,
      energy_token_explorer: stellarExplorerUrl('contract', env.NEXT_PUBLIC_ENERGY_TOKEN_ID, network),
      audit_registry_id: env.NEXT_PUBLIC_AUDIT_REGISTRY_ID,
      audit_registry_explorer: stellarExplorerUrl('contract', env.NEXT_PUBLIC_AUDIT_REGISTRY_ID, network),
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

  await setCachedCert(id, chain)

  return NextResponse.json(chain, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      'X-Cache': 'MISS',
    },
  })
}
