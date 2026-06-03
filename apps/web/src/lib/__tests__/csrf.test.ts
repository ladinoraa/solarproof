import { generateCsrfToken, validateCsrfToken } from '../csrf'

describe('CSRF token', () => {
  it('validates a freshly generated token', () => {
    const token = generateCsrfToken()
    expect(validateCsrfToken(token)).toBe(true)
  })

  it('rejects a tampered token', () => {
    const token = generateCsrfToken()
    const tampered = token.replace(/^./, 'x')
    expect(validateCsrfToken(tampered)).toBe(false)
  })

  it('rejects a token with wrong structure', () => {
    expect(validateCsrfToken('bad.token')).toBe(false)
    expect(validateCsrfToken('')).toBe(false)
  })

  it('rejects an expired token', () => {
    // Forge a token with a timestamp 2 hours in the past
    const { createHmac } = require('crypto')
    const secret = process.env.CSRF_SECRET ?? 'dev-csrf-secret-change-in-production'
    const nonce = 'aabbccddeeff00112233445566778899'
    const ts = (Date.now() - 2 * 60 * 60 * 1000).toString()
    const hmac = createHmac('sha256', secret).update(`${nonce}.${ts}`).digest('hex')
    expect(validateCsrfToken(`${nonce}.${hmac}.${ts}`)).toBe(false)
  })
})
