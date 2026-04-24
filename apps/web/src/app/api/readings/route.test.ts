import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { generateKeyPairSync, createSign, createHash } from 'crypto'

vi.mock('@/lib/supabase', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/stellar', () => ({
  anchorReading: vi.fn().mockResolvedValue('anchor_tx_hash_hex'),
  mintCertificates: vi.fn().mockResolvedValue('mint_tx_hash_hex'),
}))
vi.mock('@/lib/cache', () => ({ invalidateCert: vi.fn().mockResolvedValue(undefined) }))

import { POST } from '@/app/api/readings/route'
import { createServiceClient } from '@/lib/supabase'
import { anchorReading, mintCertificates } from '@/lib/stellar'

// Generate a real Ed25519 keypair for signing in tests
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privDer = privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer
const pubDer = publicKey.export({ type: 'spki', format: 'der' }) as Buffer
const pubKeyHex = pubDer.slice(-32).toString('hex')

const METER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const KWH = 12.5
const TIMESTAMP = 1745500800

function computeHash(meterId: string, kwh: number, ts: number): Buffer {
  const kwhStroops = BigInt(Math.round(kwh * 1e7))
  const meterBytes = Buffer.from(meterId, 'utf8')
  const kwhBuf = Buffer.alloc(8); kwhBuf.writeBigInt64LE(kwhStroops)
  const tsBuf = Buffer.alloc(8); tsBuf.writeBigInt64LE(BigInt(ts))
  return createHash('sha256').update(meterBytes).update(kwhBuf).update(tsBuf).digest()
}

function signHash(hash: Buffer): string {
  const sign = createSign('ed25519')
  sign.update(hash)
  return sign.sign({ key: privDer, format: 'der', type: 'pkcs8' }).toString('hex')
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/readings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDb(meter: unknown, readingInsert: unknown, certInsert = {}) {
  const single = vi.fn().mockResolvedValue({ data: readingInsert, error: null })
  const meterSingle = vi.fn().mockResolvedValue({ data: meter })
  const insert = vi.fn().mockReturnValue({ select: () => ({ single }) })
  const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({}) })
  const from = vi.fn((table: string) => {
    if (table === 'meters') return { select: () => ({ eq: () => ({ eq: () => ({ single: meterSingle }) }) }) }
    if (table === 'readings') return { insert, update }
    if (table === 'certificates') return { insert: vi.fn().mockResolvedValue({}) }
    return {}
  })
  return from
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/readings', () => {
  it('returns 400 for missing body', async () => {
    const req = new NextRequest('http://localhost/api/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payload', async () => {
    const res = await POST(makeRequest({ meter_id: 'bad', kwh: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when meter not found', async () => {
    const from = makeDb(null, null)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const hash = computeHash(METER_ID, KWH, TIMESTAMP)
    const sig = signHash(hash)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: sig }))
    expect(res.status).toBe(404)
  })

  it('returns 401 for invalid signature', async () => {
    const meter = { id: METER_ID, pubkey_hex: pubKeyHex, cooperative_id: 'coop-1', cooperatives: { admin_address: 'GABC' } }
    const from = makeDb(meter, null)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const badSig = 'ff'.repeat(64)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: badSig }))
    expect(res.status).toBe(401)
  })

  it('returns 201 on success', async () => {
    const meter = { id: METER_ID, pubkey_hex: pubKeyHex, cooperative_id: 'coop-1', cooperatives: { admin_address: 'GABC' } }
    const reading = { id: 'reading-uuid', meter_id: METER_ID, kwh: KWH, reading_hash: 'hash', signature_hex: 'sig' }
    const from = makeDb(meter, reading)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const hash = computeHash(METER_ID, KWH, TIMESTAMP)
    const sig = signHash(hash)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: sig }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.anchor_tx_hash).toBe('anchor_tx_hash_hex')
    expect(body.mint_tx_hash).toBe('mint_tx_hash_hex')
  })

  it('returns 500 when anchor fails', async () => {
    const meter = { id: METER_ID, pubkey_hex: pubKeyHex, cooperative_id: 'coop-1', cooperatives: { admin_address: 'GABC' } }
    const reading = { id: 'reading-uuid', meter_id: METER_ID, kwh: KWH, reading_hash: 'hash', signature_hex: 'sig' }
    const from = makeDb(meter, reading)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    vi.mocked(anchorReading).mockRejectedValueOnce(new Error('Stellar RPC error'))
    const hash = computeHash(METER_ID, KWH, TIMESTAMP)
    const sig = signHash(hash)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: sig }))
    expect(res.status).toBe(500)
  })

  it('returns 409 when reading already anchored', async () => {
    const meter = { id: METER_ID, pubkey_hex: pubKeyHex, cooperative_id: 'coop-1', cooperatives: { admin_address: 'GABC' } }
    const reading = { id: 'reading-uuid', meter_id: METER_ID, kwh: KWH, reading_hash: 'hash', signature_hex: 'sig' }
    const from = makeDb(meter, reading)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    vi.mocked(anchorReading).mockRejectedValueOnce(new Error('AlreadyAnchored'))
    const hash = computeHash(METER_ID, KWH, TIMESTAMP)
    const sig = signHash(hash)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: sig }))
    expect(res.status).toBe(409)
  })

  it('returns 500 when mint fails', async () => {
    const meter = { id: METER_ID, pubkey_hex: pubKeyHex, cooperative_id: 'coop-1', cooperatives: { admin_address: 'GABC' } }
    const reading = { id: 'reading-uuid', meter_id: METER_ID, kwh: KWH, reading_hash: 'hash', signature_hex: 'sig' }
    const from = makeDb(meter, reading)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    vi.mocked(mintCertificates).mockRejectedValueOnce(new Error('Mint failed'))
    const hash = computeHash(METER_ID, KWH, TIMESTAMP)
    const sig = signHash(hash)
    const res = await POST(makeRequest({ meter_id: METER_ID, kwh: KWH, timestamp: TIMESTAMP, signature_hex: sig }))
    expect(res.status).toBe(500)
  })
})
