import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    NEXT_PUBLIC_STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
  },
}))

import { createServiceClient } from '@/lib/supabase'
import { GET } from '@/app/api/health/route'

const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockCreateServiceClient = vi.mocked(createServiceClient)

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateServiceClient.mockReturnValue({ from: mockFrom } as never)
  // Default: DB responds fast
  mockSelect.mockResolvedValue({ data: null, error: null, count: 0 })
  // Default: Stellar RPC responds fast with ok
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 'healthy' }) }))
})

describe('GET /api/health', () => {
  it('returns 200 with status ok when all checks pass', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks.database.status).toBe('ok')
    expect(body.checks.stellar_rpc.status).toBe('ok')
    expect(typeof body.ts).toBe('number')
  })

  it('returns 503 when DB check errors', async () => {
    mockSelect.mockRejectedValue(new Error('connection refused'))
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.checks.database.status).toBe('error')
  })

  it('returns 503 when Stellar RPC errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('error')
    expect(body.checks.stellar_rpc.status).toBe('error')
  })

  it('returns 200 with degraded status when a check is slow', async () => {
    // Simulate slow DB (> 300 ms threshold) by making the mock delay
    mockSelect.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null, count: 0 }), 310))
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('degraded')
  })

  it('includes latency_ms for each check', async () => {
    const res = await GET()
    const body = await res.json()
    expect(typeof body.checks.database.latency_ms).toBe('number')
    expect(typeof body.checks.stellar_rpc.latency_ms).toBe('number')
  })
})
