import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, accessToken: 'tok' }),
  isAuthError: vi.fn().mockReturnValue(false),
}))

import { createServiceClient } from '@/lib/supabase'
import { POST } from '@/app/api/meters/route'

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    headers: { get: (_: string) => null },
  } as unknown as Parameters<typeof POST>[0]
}

const VALID_BODY = {
  name: 'Solar Panel A',
  cooperative_id: '123e4567-e89b-12d3-a456-426614174000',
  serial_number: 'SN-001',
  pubkey_hex: 'a'.repeat(64),
}

function mockDb({ existing = null, insertData = { id: 'meter-1', ...VALID_BODY, active: true } } = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing })
  const insertSingle = vi.fn().mockResolvedValue({ data: insertData, error: null })

  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: insertSingle }),
      }),
    }),
  } as ReturnType<typeof createServiceClient>)
}

beforeEach(() => vi.clearAllMocks())

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

  it('returns 400 when pubkey_hex is wrong length', async () => {
    mockDb()
    const res = await POST(makeRequest({ ...VALID_BODY, pubkey_hex: 'short' }))
    expect(res.status).toBe(400)
  })
})
