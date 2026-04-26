import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Middleware that:
 * 1. Injects a correlation ID into every API request.
 * 2. Redirects unversioned /api/* routes to /api/v1/* with a deprecation header.
 *
 * Correlation ID:
 *   - Reads `X-Correlation-Id` from the incoming request if present.
 *   - Otherwise generates a new UUID v4.
 *   - Forwards the ID in the `X-Correlation-Id` response header.
 *
 * API versioning:
 *   - Requests to /api/<route> (not already /api/v1/) are redirected to
 *     /api/v1/<route> with a 308 Permanent Redirect and a Deprecation header.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── API versioning redirect ───────────────────────────────────────────────
  // Match /api/<segment> but NOT /api/v1/... or /api/docs (OpenAPI spec)
  const unversioned = pathname.match(/^\/api\/(?!v\d+\/)(.+)$/)
  if (unversioned) {
    const url = req.nextUrl.clone()
    url.pathname = `/api/v1/${unversioned[1]}`
    const redirect = NextResponse.redirect(url, { status: 308 })
    redirect.headers.set('Deprecation', 'true')
    redirect.headers.set('Link', `<${url.toString()}>; rel="successor-version"`)
    // Propagate correlation ID on the redirect response too
    const correlationId = req.headers.get('x-correlation-id') ?? randomUUID()
    redirect.headers.set('x-correlation-id', correlationId)
    return redirect
  }

  // ── Correlation ID injection ──────────────────────────────────────────────
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID()
  const res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        'x-correlation-id': correlationId,
      }),
    },
  })
  res.headers.set('x-correlation-id', correlationId)
  return res
}

export const config = {
  matcher: '/api/:path*',
}
