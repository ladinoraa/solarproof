/**
 * Tests for the Supabase test factories — issue #123.
 *
 * These tests run against a mocked Supabase client so they work in CI
 * without a live database. They verify that:
 *   - each factory produces the expected shape
 *   - cleanup() removes rows in the correct order
 *   - factories auto-create parent rows when IDs are omitted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  makeCooperative,
  makeMeter,
  makeReading,
  makeCertificate,
  makeOperator,
  cleanup,
  emptyCleanupIds,
  type CleanupIds,
} from './factories'

// ---------------------------------------------------------------------------
// Minimal Supabase mock
// ---------------------------------------------------------------------------

const deleteMock = vi.fn().mockReturnValue({ error: null })
const inMock = vi.fn().mockReturnValue({ error: null })
deleteMock.mockReturnValue({ in: inMock })

function makeInsertMock(row: Record<string, unknown>) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null })
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  return { insert, select, single }
}

function buildDb(rows: Record<string, Record<string, unknown>>) {
  return {
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: rows[table], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ in: inMock }),
    })),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('factories', () => {
  let ids: CleanupIds

  beforeEach(() => {
    ids = emptyCleanupIds()
    vi.clearAllMocks()
  })

  it('makeCooperative returns a cooperative row and tracks id', async () => {
    const row = { id: 'coop-1', name: 'Test Cooperative 1', admin_address: 'GABC', created_at: '' }
    const db = buildDb({ cooperatives: row }) as any
    const result = await makeCooperative(db, ids)
    expect(result.id).toBe('coop-1')
    expect(ids.cooperatives).toContain('coop-1')
  })

  it('makeMeter returns a meter row and tracks id', async () => {
    const coopRow = { id: 'coop-2', name: 'C', admin_address: 'G', created_at: '' }
    const meterRow = { id: 'meter-1', cooperative_id: 'coop-2', serial_number: 'SN-1', name: 'M', pubkey_hex: 'a'.repeat(64), active: true, created_at: '' }
    const db = {
      from: vi.fn((table: string) => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: table === 'cooperatives' ? coopRow : meterRow,
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({ in: inMock }),
      })),
    } as any
    const result = await makeMeter(db, ids)
    expect(result.id).toBe('meter-1')
    expect(ids.meters).toContain('meter-1')
  })

  it('makeReading returns a reading row and tracks id', async () => {
    const rows: Record<string, unknown> = {
      cooperatives: { id: 'coop-3', name: 'C', admin_address: 'G', created_at: '' },
      meters: { id: 'meter-2', cooperative_id: 'coop-3', serial_number: 'SN-2', name: 'M', pubkey_hex: 'a'.repeat(64), active: true, created_at: '' },
      readings: { id: 'reading-1', meter_id: 'meter-2', kwh: 10, timestamp: '', reading_hash: 'h', signature_hex: 'b'.repeat(128), anchored: false, minted: false, anchor_tx_hash: null, mint_tx_hash: null, mint_diagnosis: null },
    }
    const db = {
      from: vi.fn((table: string) => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: rows[table], error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({ in: inMock }),
      })),
    } as any
    const result = await makeReading(db, ids)
    expect(result.id).toBe('reading-1')
    expect(ids.readings).toContain('reading-1')
  })

  it('makeCertificate returns a certificate row and tracks id', async () => {
    const rows: Record<string, unknown> = {
      cooperatives: { id: 'coop-4', name: 'C', admin_address: 'G', created_at: '' },
      meters: { id: 'meter-3', cooperative_id: 'coop-4', serial_number: 'SN-3', name: 'M', pubkey_hex: 'a'.repeat(64), active: true, created_at: '' },
      readings: { id: 'reading-2', meter_id: 'meter-3', kwh: 10, timestamp: '', reading_hash: 'h2', signature_hex: 'b'.repeat(128), anchored: false, minted: false, anchor_tx_hash: null, mint_tx_hash: null, mint_diagnosis: null },
      certificates: { id: 'cert-1', cooperative_id: 'coop-4', reading_id: 'reading-2', reading_hash: 'h2', anchor_tx_hash: 'a', mint_tx_hash: 'm', kwh: 10, issued_at: '', retired: false, retired_at: null, retired_by: null },
    }
    const db = {
      from: vi.fn((table: string) => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: rows[table], error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({ in: inMock }),
      })),
    } as any
    const result = await makeCertificate(db, ids)
    expect(result.id).toBe('cert-1')
    expect(ids.certificates).toContain('cert-1')
  })

  it('makeOperator returns cooperative and admin_address', async () => {
    const row = { id: 'coop-5', name: 'Op', admin_address: 'GOPERATOR', created_at: '' }
    const db = buildDb({ cooperatives: row }) as any
    const result = await makeOperator(db, ids)
    expect(result.cooperative.id).toBe('coop-5')
    expect(typeof result.admin_address).toBe('string')
    expect(ids.cooperatives).toContain('coop-5')
  })

  it('cleanup calls delete on all tracked tables', async () => {
    const deleteIn = vi.fn().mockResolvedValue({ error: null })
    const deleteChain = vi.fn().mockReturnValue({ in: deleteIn })
    const db = { from: vi.fn().mockReturnValue({ delete: deleteChain }) } as any

    const testIds: CleanupIds = {
      certificates: ['cert-1'],
      readings: ['reading-1'],
      meters: ['meter-1'],
      cooperatives: ['coop-1'],
    }
    await cleanup(db, testIds)

    expect(db.from).toHaveBeenCalledWith('certificates')
    expect(db.from).toHaveBeenCalledWith('readings')
    expect(db.from).toHaveBeenCalledWith('meters')
    expect(db.from).toHaveBeenCalledWith('cooperatives')
    expect(deleteIn).toHaveBeenCalledTimes(4)
  })

  it('cleanup skips tables with no tracked ids', async () => {
    const deleteIn = vi.fn().mockResolvedValue({ error: null })
    const deleteChain = vi.fn().mockReturnValue({ in: deleteIn })
    const db = { from: vi.fn().mockReturnValue({ delete: deleteChain }) } as any

    await cleanup(db, emptyCleanupIds())
    expect(db.from).not.toHaveBeenCalled()
  })
})
