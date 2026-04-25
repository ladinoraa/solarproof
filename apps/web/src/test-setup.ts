import { etc } from '@noble/ed25519'
import { createHash } from 'crypto'

// @noble/ed25519 v2 requires a synchronous SHA-512 implementation in Node.js
etc.sha512Sync = (...msgs) => {
  const h = createHash('sha512')
  for (const m of msgs) h.update(m)
  return Uint8Array.from(h.digest())
}
