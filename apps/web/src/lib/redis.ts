/**
 * Shared ioredis connection for BullMQ.
 *
 * The connection is lazily created on first use so Next.js build-time
 * import of this module does not fail when REDIS_URL is not set.
 */
import IORedis from 'ioredis'

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
    connection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    })
  }
  return connection
}
