/**
 * Thin Upstash Redis cache wrapper.
 * Falls back to no-op when UPSTASH_REDIS_REST_URL is not set (local dev / CI).
 */

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env

const CERT_TTL = 60 // seconds

function redisUrl(path: string) {
  if (!UPSTASH_REDIS_REST_URL) {
    throw new Error('UPSTASH_REDIS_REST_URL is not configured')
  }
  return `${UPSTASH_REDIS_REST_URL}${path}`
}

async function redisFetch(path: string, options: RequestInit = {}) {
  if (!UPSTASH_REDIS_REST_URL) {
    throw new Error('UPSTASH_REDIS_REST_URL is not configured')
  }

  const res = await fetch(redisUrl(path), {
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    ...options,
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || 'Redis request failed')
  }
  return json
}

async function redisGet<T>(key: string): Promise<T | null> {
  const json = await redisFetch(`/get/${encodeURIComponent(key)}`)
  if (json.result == null) return null
  console.log(`[cache] HIT ${key}`)
  return JSON.parse(json.result) as T
}

async function redisSet(key: string, value: unknown, ttl: number): Promise<void> {
  await redisFetch(`/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttl }),
  })
  console.log(`[cache] SET ${key} ttl=${ttl}s`)
}

async function redisDel(key: string): Promise<void> {
  await redisFetch(`/del/${encodeURIComponent(key)}`, {
    method: 'POST',
  })
  console.log(`[cache] DEL ${key}`)
}

async function redisEval<T>(script: string, keys: string[], args: (string | number)[]): Promise<T> {
  const json = await redisFetch('/eval', {
    method: 'POST',
    body: JSON.stringify({ script, keys, args }),
  })
  return json.result as T
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

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  // Use Lua script for atomic INCR + EXPIRE
  const script = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return {current, redis.call("TTL", KEYS[1])}
  `
  const [count, ttl] = await redisEval<[number, number]>(script, [key], [windowSeconds])

  const remaining = Math.max(limit - count, 0)

  return {
    allowed: count <= limit,
    remaining,
    resetSeconds: ttl < 0 ? 0 : ttl,
  }
}
