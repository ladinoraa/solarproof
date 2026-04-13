import { createHash } from 'crypto'

/**
 * Compute the canonical reading hash: SHA-256(meter_id || kwh_stroops_le || timestamp_le)
 * This must match the hash signed by the meter device.
 */
export function computeReadingHash(meterId: string, kwhStroops: bigint, timestampUnix: bigint): Buffer {
  const meterBytes = Buffer.from(meterId, 'utf8')
  const kwhBuf = Buffer.alloc(8)
  kwhBuf.writeBigInt64LE(kwhStroops)
  const tsBuf = Buffer.alloc(8)
  tsBuf.writeBigInt64LE(timestampUnix)
  return createHash('sha256').update(meterBytes).update(kwhBuf).update(tsBuf).digest()
}
