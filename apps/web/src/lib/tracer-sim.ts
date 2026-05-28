/**
 * tracer-sim integration — replays a failed Soroban mint transaction
 * to produce a human-readable diagnosis.
 *
 * When TRACER_SIM_URL is not set (local dev / CI) the module returns a
 * stub diagnosis so the rest of the flow is unaffected.
 */

import { createServiceClient } from '@/lib/supabase'
import { fireWebhook } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

export interface TracerDiagnosis {
  error_code: string
  message: string
  suggestion: string
  replayed_at: string
}

const TRACER_SIM_URL = process.env.TRACER_SIM_URL

/**
 * Replay a failed mint via tracer-sim and return a structured diagnosis.
 * Falls back to a generic diagnosis when the service is unavailable.
 */
async function replay(
  readingId: string,
  mintError: string
): Promise<TracerDiagnosis> {
  const replayed_at = new Date().toISOString()

  if (!TRACER_SIM_URL) {
    return {
      error_code: 'TRACER_SIM_UNAVAILABLE',
      message: mintError,
      suggestion: 'Set TRACER_SIM_URL to enable automatic diagnosis.',
      replayed_at,
    }
  }

  try {
    const res = await fetch(`${TRACER_SIM_URL}/replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reading_id: readingId, error: mintError }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`tracer-sim responded ${res.status}`)
    }

    const data = await res.json() as Partial<TracerDiagnosis>
    return {
      error_code: data.error_code ?? 'UNKNOWN',
      message: data.message ?? mintError,
      suggestion: data.suggestion ?? 'Check Stellar network status.',
      replayed_at,
    }
  } catch (err) {
    logger.warn('tracer_sim.replay_failed', { reading_id: readingId, error: String(err) })
    return {
      error_code: 'REPLAY_ERROR',
      message: mintError,
      suggestion: 'tracer-sim replay failed. Check service logs.',
      replayed_at,
    }
  }
}

/**
 * Diagnose a failed mint:
 * 1. Replay via tracer-sim
 * 2. Store diagnosis on the reading record
 * 3. Fire operator webhook
 */
export async function diagnoseMintFailure(
  readingId: string,
  cooperativeId: string,
  mintError: string
): Promise<TracerDiagnosis> {
  const diagnosis = await replay(readingId, mintError)

  const db = createServiceClient()
  await db
    .from('readings')
    .update({ mint_diagnosis: diagnosis as unknown as Record<string, unknown> })
    .eq('id', readingId)

  void fireWebhook(cooperativeId, 'mint_failed', {
    reading_id: readingId,
    diagnosis,
  })

  return diagnosis
}
