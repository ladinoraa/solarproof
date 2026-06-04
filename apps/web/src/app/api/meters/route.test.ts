import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, cooperativeId: 'coop-1', accessToken: 'tok' }),
  isAuthError: vi.fn().mockReturnValue(false),
}))

import { createServiceClient } from '@/lib/supabase'
import { GET, POST } from '@/app/api/meters/route'
import { requireAuth } from '@/lib/auth'

function makeGetRequest() {
  return {
    headers: { get: (_: string) => null },
    nextUrl: { searchParams: new URLSearchParams() },
  } as unknown as Parameters<typeof GET>[0]
}

function mockDbGet(data: unknown[], error: unknown = null) {
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  } as ReturnType<typeof createServiceClient>)
}

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    headers: { get: (_: string) => null },
  } as unknown as Parameters<typeof POST>[0]
}

const VALID_BODY = {
  name: 'Solar Panel A',
  serial_number: 'SN-001',
  pubkey_hex: 'a'.repeat(64),
}

function mockDb({
  existing = null,
  accountType = 'cooperative',
  meterCount = 0,
  insertData = { id: 'meter-1', ...VALID_BODY, active: true }
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing })
  const insertSingle = vi.fn().mockResolvedValue({ data: insertData, error: null })

  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockImplementation((_fields, options) => {
        if (options?.count) return Promise.resolve({ count: meterCount, error: null })
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existing }),
            single: vi.fn().mockResolvedValue({ data: { account_type: accountType }, error: null }),
          }),
        }
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: insertSingle }),
      }),
    }),
  } as ReturnType<typeof createServiceClient>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ user: { id: 'user-1' }, cooperativeId: 'coop-1', accessToken: 'tok' })
})

describe('POST /api/meters', () => {
  it('returns 400 when name is missing', async () => {
    mockDb()
    const { name: _, ...body } = VALID_BODY
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it('returns 409 when pubkey already exists', async () => {
    mockDb({ existing: { id: 'existing-meter' } })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already exists/i)
  })

  it('returns 201 when meter is registered successfully', async () => {
    mockDb()
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
  })

  it('returns 403 when individual account limit is reached', async () => {
    mockDb({ accountType: 'individual', meterCount: 1 })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(403)
  })

  it('returns 400 when pubkey_hex is wrong length', async () => {
    mockDb()
    const res = await POST(makeRequest({ ...VALID_BODY, pubkey_hex: 'short' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/meters', () => {
  it('returns 200 with meters list', async () => {
    mockDbGet([{ id: 'meter-1', serial_number: 'SN-001' }])
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('returns 500 when DB errors', async () => {
    mockDbGet([], { message: 'db failure' })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db failure')
  })
})
