import { etc } from '@noble/ed25519'
import { createHash } from 'crypto'

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID = 'C_TEST_ENERGY_TOKEN'
process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ID = 'C_TEST_AUDIT_REGISTRY'
process.env.NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID = 'C_TEST_GOVERNANCE'
process.env.MINTER_SECRET_KEY = 'S' + 'TEST_MINTER_SECRET_KEY_MUST_BE_56_CHARS_'.repeat(2).slice(0, 55)

// @noble/ed25519 v2 requires a synchronous SHA-512 implementation in Node.js
etc.sha512Sync = (...msgs) => {
  const h = createHash('sha512')
  for (const m of msgs) h.update(m)
  return Uint8Array.from(h.digest())
}
