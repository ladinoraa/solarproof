import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @supabase/supabase-js before importing auth
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  },
}))

import { createClient } from '@supabase/supabase-js'
import { requireAuth, isAuthError } from '@/lib/auth'

const mockGetUser = vi.fn()
const mockCreateClient = vi.mocked(createClient)

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
  } as never)
})

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/meters', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('requireAuth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const result = await requireAuth(makeRequest())
    expect(isAuthError(result)).toBe(true)
    const res = result as Response
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/missing/i)
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })
    const result = await requireAuth(makeRequest('Bearer bad-token'))
    expect(isAuthError(result)).toBe(true)
    const res = result as Response
    expect(res.status).toBe(401)
  })

  it('returns user when token is valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'op@example.com' } },
      error: null,
    })
    const result = await requireAuth(makeRequest('Bearer valid-token'))
    expect(isAuthError(result)).toBe(false)
    const auth = result as { user: { id: string; email?: string }; accessToken: string }
    expect(auth.user.id).toBe('user-1')
    expect(auth.accessToken).toBe('valid-token')
  })
})
