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

export function certCacheKey(id: string) {
  return `cert:${id}`
}

export async function getCachedCert<T>(id: string): Promise<T | null> {
  const hit = await redisGet<T>(certCacheKey(id))
  if (!hit) console.log(`[cache] MISS ${certCacheKey(id)}`)
  return hit
}

export async function setCachedCert(id: string, value: unknown): Promise<void> {
  await redisSet(certCacheKey(id), value, CERT_TTL)
}

export async function invalidateCert(...ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => redisDel(certCacheKey(id))))
}
