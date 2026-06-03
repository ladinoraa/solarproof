import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHmac } from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET ?? 'dev-csrf-secret-change-in-production'
const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/** Generate a signed CSRF token: `<random>.<hmac>.<timestamp>` */
export function generateCsrfToken(): string {
  const nonce = randomBytes(16).toString('hex')
  const ts = Date.now().toString()
  const hmac = createHmac('sha256', CSRF_SECRET).update(`${nonce}.${ts}`).digest('hex')
  return `${nonce}.${hmac}.${ts}`
}

/** Validate a CSRF token. Returns true if valid and not expired. */
export function validateCsrfToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [nonce, hmac, ts] = parts
  const expected = createHmac('sha256', CSRF_SECRET).update(`${nonce}.${ts}`).digest('hex')
  if (expected !== hmac) return false
  if (Date.now() - parseInt(ts, 10) > TOKEN_TTL_MS) return false
  return true
}

/**
 * Middleware helper: validates CSRF for state-changing methods.
 * Uses double-submit cookie pattern: cookie value must match x-csrf-token header.
 * Returns a 403 NextResponse on failure, or null if valid.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase()
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return null

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
  const headerToken = req.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken) {
    return NextResponse.json({ error: 'CSRF token missing' }, { status: 403 })
  }
  if (cookieToken !== headerToken) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
  }
  if (!validateCsrfToken(cookieToken)) {
    return NextResponse.json({ error: 'CSRF token invalid or expired' }, { status: 403 })
  }
  return null
}

/**
 * GET /api/csrf — issues a fresh CSRF token cookie and returns the token.
 * Clients must call this before any state-changing request.
 */
export function csrfTokenResponse(): NextResponse {
  const token = generateCsrfToken()
  const res = NextResponse.json({ csrf_token: token })
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by JS for double-submit
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 3600,
  })
  return res
}
