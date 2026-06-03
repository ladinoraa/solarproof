import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('getCorsHeaders', () => {
  const PROD_ORIGIN = 'https://solarproof.vercel.app'
  const DEV_ORIGIN = 'http://localhost:3000'
  const UNKNOWN_ORIGIN = 'https://evil.example.com'

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null for a null origin', async () => {
    const { getCorsHeaders } = await import('./cors')
    expect(getCorsHeaders(null)).toBeNull()
  })

  it('returns null for an unknown origin', async () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', PROD_ORIGIN)
    vi.stubEnv('NODE_ENV', 'production')
    const { getCorsHeaders } = await import('./cors')
    expect(getCorsHeaders(UNKNOWN_ORIGIN)).toBeNull()
  })

  it('allows a configured production origin', async () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', PROD_ORIGIN)
    vi.stubEnv('NODE_ENV', 'production')
    const { getCorsHeaders } = await import('./cors')
    const headers = getCorsHeaders(PROD_ORIGIN)
    expect(headers).not.toBeNull()
    expect(headers!['Access-Control-Allow-Origin']).toBe(PROD_ORIGIN)
    expect(headers!['Access-Control-Allow-Credentials']).toBe('true')
    expect(headers!['Vary']).toBe('Origin')
  })

  it('allows localhost in development even without explicit config', async () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', '')
    vi.stubEnv('NODE_ENV', 'development')
    const { getCorsHeaders } = await import('./cors')
    const headers = getCorsHeaders(DEV_ORIGIN)
    expect(headers).not.toBeNull()
    expect(headers!['Access-Control-Allow-Origin']).toBe(DEV_ORIGIN)
  })

  it('blocks localhost in production when not explicitly configured', async () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', PROD_ORIGIN)
    vi.stubEnv('NODE_ENV', 'production')
    const { getCorsHeaders } = await import('./cors')
    expect(getCorsHeaders(DEV_ORIGIN)).toBeNull()
  })

  it('allows multiple configured origins', async () => {
    const origins = `${PROD_ORIGIN},https://staging.solarproof.vercel.app`
    vi.stubEnv('CORS_ALLOWED_ORIGINS', origins)
    vi.stubEnv('NODE_ENV', 'production')
    const { getCorsHeaders } = await import('./cors')
    expect(getCorsHeaders('https://staging.solarproof.vercel.app')).not.toBeNull()
    expect(getCorsHeaders(PROD_ORIGIN)).not.toBeNull()
  })

  it('includes allowed methods and headers', async () => {
    vi.stubEnv('CORS_ALLOWED_ORIGINS', PROD_ORIGIN)
    vi.stubEnv('NODE_ENV', 'production')
    const { getCorsHeaders } = await import('./cors')
    const headers = getCorsHeaders(PROD_ORIGIN)!
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization')
  })
})
