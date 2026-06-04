/**
 * Job queue powered by BullMQ + Redis.
 *
 * - `enqueue` adds a job to Redis and returns the job ID immediately.
 * - A `Worker` processes jobs asynchronously outside the HTTP request cycle.
 * - Failed jobs are retried up to 3 times with exponential back-off.
 * - Jobs that exhaust all attempts land in BullMQ's built-in failed set
 *   (acts as the dead-letter queue).
 *
 * The Supabase `jobs` table is kept in sync so callers can poll
 * `GET /api/jobs/:id` for status via the existing HTTP endpoint.
 */
import { Queue, Worker, type Job } from 'bullmq'
import { createServiceClient } from '@/lib/supabase'
import { getRedisConnection } from '@/lib/redis'

export type JobType = 'anchor_and_mint'
export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

const QUEUE_NAME = 'stellar-transactions'

const BACKOFF = {
  type: 'exponential' as const,
  delay: 2_000, // 2 s → 4 s → 8 s
}

// Lazily-created queue instance (safe to call during SSR/build)
let _queue: Queue | null = null
function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: BACKOFF,
        removeOnComplete: { count: 500 },
        removeOnFail: false, // keep failed jobs for inspection (dead-letter)
      },
    })
  }
  return _queue
}

/**
 * Enqueue a background job and return its BullMQ job ID immediately.
 *
 * The reading has already been persisted before this call; this only
 * schedules the Stellar anchor + mint step asynchronously.
 *
 * @returns BullMQ job ID (string).
 */
export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>
): Promise<string> {
  const db = createServiceClient()

  // Persist a job record so the HTTP poll endpoint works immediately
  const { data, error } = await db
    .from('jobs')
    .insert({ type, payload, status: 'pending', attempts: 0 })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to persist job: ${error?.message}`)

  const dbJobId: string = data.id

  // Push to Redis queue; use the Supabase UUID as the BullMQ job name
  // so we can correlate them.
  await getQueue().add(type, { ...payload, dbJobId }, { jobId: dbJobId })

  return dbJobId
}

// ── Worker (runs in the same Node process for simplicity) ────────────────────

/**
 * Start the BullMQ worker that consumes `stellar-transactions` jobs.
 *
 * Call once from `apps/web/src/instrumentation.ts` (server-side only).
 */
export function startWorker(): Worker {
  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  })

  worker.on('failed', (job, err) => {
    console.error(`[queue] job ${job?.id} failed permanently`, err.message)
  })

  return worker
}

// ── Job handler ──────────────────────────────────────────────────────────────

async function processJob(job: Job): Promise<void> {
  const db = createServiceClient()
  const { dbJobId, ...payload } = job.data as Record<string, unknown> & { dbJobId: string }

  // Mark running in Supabase
  await db.from('jobs').update({ status: 'running', attempts: job.attemptsMade + 1 }).eq('id', dbJobId)

  try {
    const result = await runAnchorAndMint(payload as AnchorAndMintPayload)
    await db.from('jobs').update({ status: 'done', result }).eq('id', dbJobId)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const isFinal = job.attemptsMade + 1 >= (job.opts.attempts ?? 3)
    await db
      .from('jobs')
      .update({ status: isFinal ? 'failed' : 'pending', error: errorMsg })
      .eq('id', dbJobId)
    throw err // re-throw so BullMQ applies back-off / moves to failed set
  }
}

// ── Anchor-and-mint handler ──────────────────────────────────────────────────

interface AnchorAndMintPayload {
  readingId: string
  readingHashHex: string
  recipientAddress: string
  kwh: number
  correlationId?: string
}

async function runAnchorAndMint(payload: AnchorAndMintPayload): Promise<Record<string, unknown>> {
  const { anchorReading, mintCertificates } = await import('@/lib/stellar')
  const { createServiceClient: svc } = await import('@/lib/supabase')
  const { invalidateCert } = await import('@/lib/cache')
  const { fireWebhook } = await import('@/lib/webhooks')

  const { readingId, readingHashHex, recipientAddress, kwh, correlationId } = payload
  const db = svc()
  const readingHash = Buffer.from(readingHashHex, 'hex')

  const anchorTxHash = await anchorReading({ readingHash, correlationId })
  await db.from('readings').update({ anchored: true, anchor_tx_hash: anchorTxHash }).eq('id', readingId)

  const mintTxHash = await mintCertificates(recipientAddress, kwh, correlationId)
  await db.from('readings').update({ minted: true, mint_tx_hash: mintTxHash }).eq('id', readingId)

  const { data: reading } = await db
    .from('readings')
    .select('meter_id, meters(cooperative_id)')
    .eq('id', readingId)
    .single()

  const cooperativeId = (reading?.meters as { cooperative_id: string } | null)?.cooperative_id
  if (cooperativeId) {
    await db.from('certificates').insert({
      cooperative_id: cooperativeId,
      reading_id: readingId,
      reading_hash: readingHashHex,
      anchor_tx_hash: anchorTxHash,
      mint_tx_hash: mintTxHash,
      kwh,
      issued_at: new Date().toISOString(),
      retired: false,
    })
    await invalidateCert(readingId, readingHashHex, mintTxHash)
    await fireWebhook(cooperativeId, 'anchor', { reading_id: readingId, anchor_tx_hash: anchorTxHash })
    await fireWebhook(cooperativeId, 'mint', { reading_id: readingId, mint_tx_hash: mintTxHash, kwh })
  }

  return { anchor_tx_hash: anchorTxHash, mint_tx_hash: mintTxHash }
}
