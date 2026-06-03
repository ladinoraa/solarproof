import { csrfTokenResponse } from '@/lib/csrf'

/** GET /api/csrf — returns a fresh CSRF token and sets the cookie. */
export function GET() {
  return csrfTokenResponse()
}
