import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export function middleware(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64')
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: https:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `report-uri /api/csp-report`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
