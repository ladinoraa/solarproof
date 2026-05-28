/**
 * Idempotency key store backed by Upstash Redis.
 *
 * Clients send an `Idempotency-Key` header (UUID recommended) with each POST.
 * The server stores the response body + status on success and returns the
 * cached response for any duplicate request within the TTL window.
 *
 * TTL is configurable via IDEMPOTENCY_TTL_SECONDS (default: 86400 = 24 h).
 */

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env

const TTL = Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 86400)

export interface IdempotentResponse {
  body: unknown
  status: number
}

function key(idempotencyKey: string) {
  return `idem:${idempotencyKey}`
}

async function redisGet<T>(k: string): Promise<T | null> {
  if (!UPSTASH_REDIS_REST_URL) return null
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(k)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    cache: 'no-store',
  })
  const json = await res.json() as { result: string | null }
  if (json.result == null) return null
  return JSON.parse(json.result) as T
}

async function redisSet(k: string, value: unknown, ttl: number): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL) return
  await fetch(`${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(k)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttl }),
    cache: 'no-store',
  })
}

export async function getIdempotentResponse(idempotencyKey: string): Promise<IdempotentResponse | null> {
  return redisGet<IdempotentResponse>(key(idempotencyKey))
}

export async function storeIdempotentResponse(idempotencyKey: string, response: IdempotentResponse): Promise<void> {
  await redisSet(key(idempotencyKey), response, TTL)
}
