/**
 * Stellar signing key rotation via AWS Secrets Manager.
 *
 * - Loads the active key (and optional previous key) from Secrets Manager.
 * - Previous key remains valid for 24 h after rotation (ROTATION_GRACE_MS).
 * - Every key load is written to the Supabase audit log.
 *
 * Secret JSON shape:
 *   { "key": "<Stellar secret>", "rotatedAt": "<ISO-8601>" }
 *
 * Required env vars:
 *   AWS_REGION, MINTER_SECRET_ARN
 * Optional:
 *   MINTER_PREVIOUS_SECRET_ARN  — set during the 24-h grace window
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager'
import { Keypair } from '@stellar/stellar-sdk'
import { createClient } from '@supabase/supabase-js'

const ROTATION_GRACE_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SecretPayload {
  key: string
  rotatedAt: string
}

const smClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
})

async function fetchSecret(arn: string): Promise<SecretPayload> {
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: arn }))
  if (!res.SecretString) throw new Error(`Secret ${arn} has no string value`)
  return JSON.parse(res.SecretString) as SecretPayload
}

async function auditLog(event: string, meta: Record<string, unknown>) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    await supabase.from('audit_log').insert({
      event,
      meta,
      created_at: new Date().toISOString(),
    })
  } catch {
    // audit failures must never break the hot path
    console.error('[secrets] audit log write failed', { event })
  }
}

/**
 * Returns the active Keypair loaded from Secrets Manager.
 * Falls back to MINTER_SECRET_KEY env var for local development.
 * Logs a rotation event on every cold load.
 */
export async function getMinterKeypair(): Promise<Keypair> {
  const arn = process.env.MINTER_SECRET_ARN

  // Local dev fallback
  if (!arn) {
    const localKey = process.env.MINTER_SECRET_KEY
    if (!localKey) throw new Error('Set MINTER_SECRET_ARN (prod) or MINTER_SECRET_KEY (dev)')
    return Keypair.fromSecret(localKey)
  }

  const payload = await fetchSecret(arn)
  const keypair = Keypair.fromSecret(payload.key)

  await auditLog('minter_key_loaded', {
    publicKey: keypair.publicKey(),
    rotatedAt: payload.rotatedAt,
  })

  return keypair
}

/**
 * Returns all currently valid Keypairs (active + previous if within grace window).
 * Used by signature-verification paths that must accept keys rotated < 24 h ago.
 */
export async function getValidMinterKeypairs(): Promise<Keypair[]> {
  const keypairs: Keypair[] = [await getMinterKeypair()]

  const prevArn = process.env.MINTER_PREVIOUS_SECRET_ARN
  if (!prevArn) return keypairs

  try {
    const prev = await fetchSecret(prevArn)
    const age = Date.now() - new Date(prev.rotatedAt).getTime()
    if (age < ROTATION_GRACE_MS) {
      keypairs.push(Keypair.fromSecret(prev.key))
      await auditLog('previous_key_still_valid', {
        publicKey: Keypair.fromSecret(prev.key).publicKey(),
        rotatedAt: prev.rotatedAt,
        ageMs: age,
      })
    }
  } catch {
    // previous secret may have been deleted after grace window — that's fine
  }

  return keypairs
}
