import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/stellar', () => ({
  retireCertificate: vi.fn().mockResolvedValue('retire_tx_hash_hex'),
}))

import { POST } from '@/app/api/certificates/[id]/retire/route'
import { createServiceClient } from '@/lib/supabase'
import { retireCertificate } from '@/lib/stellar'

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const WALLET = 'GABC123'

function makeRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/certificates/${id}/retire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDb(cert: unknown, updated: unknown = cert) {
  const single = vi.fn().mockResolvedValue({ data: cert })
  const updateSingle = vi.fn().mockResolvedValue({ data: updated, error: null })
  const select = vi.fn().mockReturnValue({ single })
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
  const eq = vi.fn().mockReturnValue({ select, single })
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  const from = vi.fn().mockReturnValue({ select: () => ({ eq }), update })
  return from
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/certificates/[id]/retire', () => {
  it('returns 400 for invalid UUID param', async () => {
    const res = await POST(makeRequest('not-a-uuid', { wallet_address: WALLET }), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when wallet_address is missing', async () => {
    const res = await POST(makeRequest(VALID_UUID, {}), {
      params: Promise.resolve({ id: VALID_UUID }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when certificate not found', async () => {
    const from = makeDb(null)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const res = await POST(makeRequest(VALID_UUID, { wallet_address: WALLET }), {
      params: Promise.resolve({ id: VALID_UUID }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 409 when certificate already retired', async () => {
    const cert = { id: VALID_UUID, retired: true, kwh: 10 }
    const from = makeDb(cert)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const res = await POST(makeRequest(VALID_UUID, { wallet_address: WALLET }), {
      params: Promise.resolve({ id: VALID_UUID }),
    })
    expect(res.status).toBe(409)
  })

  it('returns 200 on successful retirement', async () => {
    const cert = { id: VALID_UUID, retired: false, kwh: 10 }
    const updated = { id: VALID_UUID, retired: true, retired_at: '2026-01-01T00:00:00Z', retired_by: WALLET }
    const from = makeDb(cert, updated)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    const res = await POST(makeRequest(VALID_UUID, { wallet_address: WALLET }), {
      params: Promise.resolve({ id: VALID_UUID }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.retired).toBe(true)
    expect(body.retire_tx_hash).toBe('retire_tx_hash_hex')
  })

  it('returns 500 when Stellar retire call fails', async () => {
    const cert = { id: VALID_UUID, retired: false, kwh: 10 }
    const from = makeDb(cert)
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)
    vi.mocked(retireCertificate).mockRejectedValueOnce(new Error('Stellar error'))
    const res = await POST(makeRequest(VALID_UUID, { wallet_address: WALLET }), {
      params: Promise.resolve({ id: VALID_UUID }),
    })
    expect(res.status).toBe(500)
  })
})
