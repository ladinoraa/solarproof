/**
 * CORS policy for SolarProof API routes.
 *
 * Allowed origins are controlled by the CORS_ALLOWED_ORIGINS environment
 * variable (comma-separated list). In development, http://localhost:3000 is
 * always permitted. Credentials mode is enabled so the browser sends cookies.
 */

const DEV_ORIGINS = ['http://localhost:3000']

/** Parse the CORS_ALLOWED_ORIGINS env var into a Set of allowed origins. */
function getAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? ''
  const configured = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const origins = [...configured]
  if (process.env.NODE_ENV !== 'production') {
    origins.push(...DEV_ORIGINS)
  }
  return new Set(origins)
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
} as const

/**
 * Return CORS response headers for the given request origin.
 * Returns null if the origin is not allowed.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin) return null
  const allowed = getAllowedOrigins()
  if (!allowed.has(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    ...CORS_HEADERS,
  }
}
