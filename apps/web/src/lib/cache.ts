/**
 * Thin Upstash Redis cache wrapper.
 * Falls back to no-op when UPSTASH_REDIS_REST_URL is not set (local dev / CI).
 */

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env

const CERT_TTL = 60 // seconds

function redisUrl(path: string) {
  return `${UPSTASH_REDIS_REST_URL}${path}`
}

async function redisGet<T>(key: string): Promise<T | null> {
  if (!UPSTASH_REDIS_REST_URL) return null
  const res = await fetch(redisUrl(`/get/${encodeURIComponent(key)}`), {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.result == null) return null
  console.log(`[cache] HIT ${key}`)
  return JSON.parse(json.result) as T
}

async function redisSet(key: string, value: unknown, ttl: number): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL) return
  await fetch(redisUrl(`/set/${encodeURIComponent(key)}`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttl }),
    cache: 'no-store',
  })
  console.log(`[cache] SET ${key} ttl=${ttl}s`)
}

async function redisDel(key: string): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL) return
  await fetch(redisUrl(`/del/${encodeURIComponent(key)}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    cache: 'no-store',
  })
  console.log(`[cache] DEL ${key}`)
}

/**
 * Build the Redis key for a certificate cache entry.
 *
 * @param id - Certificate UUID, reading hash, or mint transaction hash.
 * @returns Redis key string in the form `cert:<id>`.
 */
export function certCacheKey(id: string) {
  return `cert:${id}`
}

/**
 * Retrieve a cached certificate chain-of-custody from Redis.
 *
 * @param id - Certificate UUID, reading hash, or mint transaction hash.
 * @returns The cached value, or `null` on a cache miss or when Redis is unavailable.
 */
export async function getCachedCert<T>(id: string): Promise<T | null> {
  const hit = await redisGet<T>(certCacheKey(id))
  if (!hit) console.log(`[cache] MISS ${certCacheKey(id)}`)
  return hit
}

/**
 * Store a certificate chain-of-custody in Redis with a 60-second TTL.
 *
 * @param id - Cache key (certificate UUID, reading hash, or mint tx hash).
 * @param value - Serialisable chain-of-custody object to cache.
 */
export async function setCachedCert(id: string, value: unknown): Promise<void> {
  await redisSet(certCacheKey(id), value, CERT_TTL)
}

/**
 * Delete one or more certificate cache entries from Redis.
 * Called after a mint or retirement to prevent stale data being served.
 *
 * @param ids - One or more cache keys to invalidate.
 */
export async function invalidateCert(...ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => redisDel(certCacheKey(id))))
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW = 60 // seconds
const RATE_LIMIT_MAX = 60    // requests per window

/**
 * Sliding-window rate limiter keyed by meter public key.
 * Returns { allowed: true } or { allowed: false, retryAfter: number }.
 * Falls back to allowing all requests when Redis is unavailable.
 */
export async function checkRateLimit(pubkeyHex: string): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  if (!UPSTASH_REDIS_REST_URL) return { allowed: true }

  const key = `rl:${pubkeyHex}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - RATE_LIMIT_WINDOW

  // Use Upstash pipeline: ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE
  const pipeline = [
    ['ZREMRANGEBYSCORE', key, '-inf', String(windowStart)],
    ['ZADD', key, String(now), `${now}-${Math.random()}`],
    ['ZCARD', key],
    ['EXPIRE', key, String(RATE_LIMIT_WINDOW * 2)],
  ]

  const res = await fetch(redisUrl('/pipeline'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
    cache: 'no-store',
  })

  const results = await res.json() as Array<{ result: unknown }>
  const count = results[2]?.result as number ?? 0

  if (count > RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: RATE_LIMIT_WINDOW }
  }
  return { allowed: true }
}
