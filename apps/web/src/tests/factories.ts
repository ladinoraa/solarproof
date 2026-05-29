/**
 * Test fixtures and factories for Supabase test data — issue #123.
 *
 * Usage:
 *   import { makeCooperative, makeMeter, makeReading, makeCertificate, makeOperator, cleanup } from '@/tests/factories'
 *
 * Each factory inserts a row into the database and returns the created row.
 * Call `cleanup(ids)` in afterEach to delete test rows in dependency order.
 *
 * @example
 * ```ts
 * let ids: CleanupIds
 * beforeEach(() => { ids = emptyCleanupIds() })
 * afterEach(() => cleanup(db, ids))
 *
 * it('...', async () => {
 *   const coop = await makeCooperative(db, ids)
 *   const meter = await makeMeter(db, ids, { cooperative_id: coop.id })
 * })
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type DB = SupabaseClient<Database>
type Tables = Database['public']['Tables']

// ---------------------------------------------------------------------------
// Cleanup tracker
// ---------------------------------------------------------------------------

export interface CleanupIds {
  certificates: string[]
  readings: string[]
  meters: string[]
  cooperatives: string[]
}

/** Returns an empty CleanupIds object. */
export function emptyCleanupIds(): CleanupIds {
  return { certificates: [], readings: [], meters: [], cooperatives: [] }
}

/**
 * Delete all tracked test rows in reverse-dependency order.
 * Call this in `afterEach`.
 */
export async function cleanup(db: DB, ids: CleanupIds): Promise<void> {
  if (ids.certificates.length)
    await db.from('certificates').delete().in('id', ids.certificates)
  if (ids.readings.length)
    await db.from('readings').delete().in('id', ids.readings)
  if (ids.meters.length)
    await db.from('meters').delete().in('id', ids.meters)
  if (ids.cooperatives.length)
    await db.from('cooperatives').delete().in('id', ids.cooperatives)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0
const seq = () => ++_seq

/** Stellar-style G… address placeholder. */
const stellarAddress = () =>
  `G${'A'.repeat(54)}${String(seq()).padStart(2, '0')}`

// ---------------------------------------------------------------------------
// Cooperative factory
// ---------------------------------------------------------------------------

export type CooperativeRow = Tables['cooperatives']['Row']

/**
 * Insert a cooperative row and track it for cleanup.
 *
 * @param db   - Supabase client (service role recommended for tests).
 * @param ids  - CleanupIds tracker.
 * @param overrides - Optional field overrides.
 */
export async function makeCooperative(
  db: DB,
  ids: CleanupIds,
  overrides: Partial<Tables['cooperatives']['Insert']> = {}
): Promise<CooperativeRow> {
  const n = seq()
  const payload: Tables['cooperatives']['Insert'] = {
    name: `Test Cooperative ${n}`,
    admin_address: stellarAddress(),
    ...overrides,
  }
  const { data, error } = await db
    .from('cooperatives')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(`makeCooperative: ${error.message}`)
  ids.cooperatives.push(data.id)
  return data
}

// ---------------------------------------------------------------------------
// Meter factory
// ---------------------------------------------------------------------------

export type MeterRow = Tables['meters']['Row']

/**
 * Insert a meter row and track it for cleanup.
 * Creates a parent cooperative automatically if `cooperative_id` is not provided.
 */
export async function makeMeter(
  db: DB,
  ids: CleanupIds,
  overrides: Partial<Tables['meters']['Insert']> & { cooperative_id?: string } = {}
): Promise<MeterRow> {
  const n = seq()
  const cooperative_id =
    overrides.cooperative_id ?? (await makeCooperative(db, ids)).id
  const payload: Tables['meters']['Insert'] = {
    cooperative_id,
    serial_number: `SN-TEST-${n}`,
    name: `Test Meter ${n}`,
    pubkey_hex: 'a'.repeat(64),
    active: true,
    ...overrides,
  }
  const { data, error } = await db
    .from('meters')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(`makeMeter: ${error.message}`)
  ids.meters.push(data.id)
  return data
}

// ---------------------------------------------------------------------------
// Reading factory
// ---------------------------------------------------------------------------

export type ReadingRow = Tables['readings']['Row']

/**
 * Insert a reading row and track it for cleanup.
 * Creates a parent meter (and cooperative) automatically if `meter_id` is not provided.
 */
export async function makeReading(
  db: DB,
  ids: CleanupIds,
  overrides: Partial<Tables['readings']['Insert']> & { meter_id?: string } = {}
): Promise<ReadingRow> {
  const n = seq()
  const meter_id = overrides.meter_id ?? (await makeMeter(db, ids)).id
  const payload: Tables['readings']['Insert'] = {
    meter_id,
    kwh: 10 + n * 0.5,
    timestamp: new Date().toISOString(),
    reading_hash: `hash-test-${n}-${'0'.repeat(48)}`,
    signature_hex: 'b'.repeat(128),
    anchored: false,
    minted: false,
    ...overrides,
  }
  const { data, error } = await db
    .from('readings')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(`makeReading: ${error.message}`)
  ids.readings.push(data.id)
  return data
}

// ---------------------------------------------------------------------------
// Certificate factory
// ---------------------------------------------------------------------------

export type CertificateRow = Tables['certificates']['Row']

/**
 * Insert a certificate row and track it for cleanup.
 * Creates parent reading/meter/cooperative automatically if IDs are not provided.
 */
export async function makeCertificate(
  db: DB,
  ids: CleanupIds,
  overrides: Partial<Tables['certificates']['Insert']> & {
    cooperative_id?: string
    reading_id?: string
  } = {}
): Promise<CertificateRow> {
  const n = seq()
  const reading = overrides.reading_id
    ? null
    : await makeReading(db, ids)
  const reading_id = overrides.reading_id ?? reading!.id
  const cooperative_id =
    overrides.cooperative_id ?? (await makeCooperative(db, ids)).id

  const payload: Tables['certificates']['Insert'] = {
    cooperative_id,
    reading_id,
    reading_hash: `cert-hash-${n}-${'0'.repeat(44)}`,
    anchor_tx_hash: `anchor-tx-${n}`,
    mint_tx_hash: `mint-tx-${n}-${'0'.repeat(40)}`,
    kwh: 10 + n,
    issued_at: new Date().toISOString(),
    retired: false,
    ...overrides,
  }
  const { data, error } = await db
    .from('certificates')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(`makeCertificate: ${error.message}`)
  ids.certificates.push(data.id)
  return data
}

// ---------------------------------------------------------------------------
// Operator factory
// ---------------------------------------------------------------------------

/**
 * An "operator" is a cooperative admin — represented as a cooperative row
 * with a deterministic admin_address.
 *
 * Returns the cooperative row and the admin_address string.
 */
export interface OperatorResult {
  cooperative: CooperativeRow
  admin_address: string
}

/**
 * Create an operator (cooperative + admin address) and track for cleanup.
 */
export async function makeOperator(
  db: DB,
  ids: CleanupIds,
  overrides: Partial<Tables['cooperatives']['Insert']> = {}
): Promise<OperatorResult> {
  const admin_address = stellarAddress()
  const cooperative = await makeCooperative(db, ids, {
    admin_address,
    ...overrides,
  })
  return { cooperative, admin_address }
}
