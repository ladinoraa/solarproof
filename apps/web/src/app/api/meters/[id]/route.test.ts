import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, accessToken: 'tok' }),
  isAuthError: vi.fn().mockReturnValue(false),
}))

import { createServiceClient } from '@/lib/supabase'
import { GET, DELETE } from '@/app/api/meters/[id]/route'

const METER = { id: 'meter-1', serial_number: 'SN-001', pubkey_hex: 'a'.repeat(64), active: true, created_at: '2024-01-01T00:00:00Z', cooperative_id: 'coop-1' }

function makeRequest() {
  return { headers: { get: (_: string) => null } } as unknown as Parameters<typeof GET>[0]
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function mockDb({ found = true, updatedActive = false } = {}) {
  const single = vi.fn().mockResolvedValue(
    found
      ? { data: updatedActive ? { id: METER.id, active: false } : METER, error: null }
      : { data: null, error: { message: 'not found' } }
  )
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single,
    }),
  } as unknown as ReturnType<typeof createServiceClient>)
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/meters/:id', () => {
  it('returns 200 with meter when found', async () => {
    mockDb()
    const res = await GET(makeRequest(), makeParams('meter-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('meter-1')
  })

  it('returns 404 when meter not found', async () => {
    mockDb({ found: false })
    const res = await GET(makeRequest(), makeParams('missing'))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/meters/:id', () => {
  it('returns 200 with active=false when meter deactivated', async () => {
    mockDb({ updatedActive: true })
    const res = await DELETE(makeRequest(), makeParams('meter-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.active).toBe(false)
  })

  it('returns 404 when meter not found', async () => {
    mockDb({ found: false })
    const res = await DELETE(makeRequest(), makeParams('missing'))
    expect(res.status).toBe(404)
  })
})
