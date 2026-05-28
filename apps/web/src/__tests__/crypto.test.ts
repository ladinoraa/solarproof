/**
 * Unit tests for Ed25519 signature verification utility
 * Issue #112 — security-critical path
 *
 * Uses @noble/ed25519 to generate real keypairs and signatures so every
 * acceptance criterion is exercised against the actual verify() call used
 * in POST /api/readings.
 */

import { describe, it, expect } from 'vitest'
import * as ed from '@noble/ed25519'
import { computeReadingHash } from '@/lib/crypto'
import { kwhToStroops } from '@solarproof/stellar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeKeypair() {
  const privKey = ed.utils.randomPrivateKey()
  const pubKey = await ed.getPublicKeyAsync(privKey)
  return { privKey, pubKey }
}

async function signReading(
  privKey: Uint8Array,
  meterId: string,
  kwh: number,
  timestamp: number
): Promise<{ sig: Uint8Array; hash: Buffer }> {
  const hash = computeReadingHash(meterId, kwhToStroops(kwh), BigInt(timestamp))
  const sig = await ed.signAsync(hash, privKey)
  return { sig, hash }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Ed25519 signature verification', () => {
  const METER_ID = 'meter-abc-123'
  const KWH = 12.5
  const TIMESTAMP = 1_700_000_000

  it('valid signature returns true', async () => {
    const { privKey, pubKey } = await makeKeypair()
    const { sig, hash } = await signReading(privKey, METER_ID, KWH, TIMESTAMP)
    const result = await ed.verifyAsync(sig, hash, pubKey)
    expect(result).toBe(true)
  })

  it('invalid signature (random bytes) returns false', async () => {
    const { pubKey } = await makeKeypair()
    const hash = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP))
    const badSig = new Uint8Array(64).fill(0xab)
    const result = await ed.verifyAsync(badSig, hash, pubKey)
    expect(result).toBe(false)
  })

  it('tampered payload returns false', async () => {
    const { privKey, pubKey } = await makeKeypair()
    const { sig } = await signReading(privKey, METER_ID, KWH, TIMESTAMP)
    // Sign over original hash but verify against a different payload
    const tamperedHash = computeReadingHash(METER_ID, kwhToStroops(KWH + 1), BigInt(TIMESTAMP))
    const result = await ed.verifyAsync(sig, tamperedHash, pubKey)
    expect(result).toBe(false)
  })

  it('wrong public key returns false', async () => {
    const signer = await makeKeypair()
    const other = await makeKeypair()
    const { sig, hash } = await signReading(signer.privKey, METER_ID, KWH, TIMESTAMP)
    const result = await ed.verifyAsync(sig, hash, other.pubKey)
    expect(result).toBe(false)
  })

  it('malformed signature (wrong length) throws or returns false', async () => {
    const { pubKey } = await makeKeypair()
    const hash = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP))
    const shortSig = new Uint8Array(32) // too short
    await expect(ed.verifyAsync(shortSig, hash, pubKey)).rejects.toThrow()
  })

  it('malformed public key (wrong length) returns false', async () => {
    const { privKey } = await makeKeypair()
    const { sig, hash } = await signReading(privKey, METER_ID, KWH, TIMESTAMP)
    const badPubKey = new Uint8Array(16) // too short
    await expect(ed.verifyAsync(sig, hash, badPubKey)).rejects.toThrow()
  })

  it('computeReadingHash is deterministic', () => {
    const h1 = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP))
    const h2 = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP))
    expect(h1.toString('hex')).toBe(h2.toString('hex'))
  })

  it('computeReadingHash differs when any field changes', () => {
    const base = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP))
    const diffMeter = computeReadingHash('other-meter', kwhToStroops(KWH), BigInt(TIMESTAMP))
    const diffKwh = computeReadingHash(METER_ID, kwhToStroops(KWH + 0.1), BigInt(TIMESTAMP))
    const diffTs = computeReadingHash(METER_ID, kwhToStroops(KWH), BigInt(TIMESTAMP + 1))
    expect(base.toString('hex')).not.toBe(diffMeter.toString('hex'))
    expect(base.toString('hex')).not.toBe(diffKwh.toString('hex'))
    expect(base.toString('hex')).not.toBe(diffTs.toString('hex'))
  })
})
