import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The rate limit logic in cache.ts reads UPSTASH_REDIS_REST_URL at module load time.
 * We test the logic by mocking fetch and verifying the sliding-window behaviour
 * through the exported function directly.
 *
 * When UPSTASH_REDIS_REST_URL is not set (CI / local dev), checkRateLimit always
 * returns { allowed: true } — that path is covered by the fallback test.
 */

// Mock fetch before any imports
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('checkRateLimit — no Redis (fallback)', () => {
  it('allows all requests when UPSTASH_REDIS_REST_URL is not set', async () => {
    // In test env the env var is not set, so the module falls back to allow-all
    const { checkRateLimit } = await import('@/lib/cache')
    const result = await checkRateLimit('a'.repeat(64))
    expect(result.allowed).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('checkRateLimit — sliding window logic', () => {
  beforeEach(() => vi.clearAllMocks())

  /**
   * Directly test the rate-limit decision logic by calling the function
   * with a mocked pipeline response that returns a specific count.
   * We patch process.env inline so the module branch is exercised.
   */
  it('allows request when pipeline count is within limit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([{ result: 0 }, { result: 1 }, { result: 30 }, { result: 1 }]),
    })
    // Re-import to pick up env change
    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/cache')
    const result = await checkRateLimit('a'.repeat(64))
    expect(result.allowed).toBe(true)
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('rejects request when pipeline count exceeds limit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([{ result: 0 }, { result: 1 }, { result: 61 }, { result: 1 }]),
    })
    vi.resetModules()
    const { checkRateLimit } = await import('@/lib/cache')
    const result = await checkRateLimit('a'.repeat(64))
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.retryAfter).toBe(60)
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })
})
