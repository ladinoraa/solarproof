#!/usr/bin/env node
/**
 * scripts/gen-meter-key.mjs
 *
 * Generate an Ed25519 keypair for a simulated smart meter.
 * Writes meter-key.json to the current directory.
 *
 * Usage: node scripts/gen-meter-key.mjs
 */

import { generateKeyPairSync } from 'crypto'
import { writeFileSync } from 'fs'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')

const privDer = privateKey.export({ type: 'pkcs8', format: 'der' })
const pubDer = publicKey.export({ type: 'spki', format: 'der' })

// Ed25519 raw key bytes: last 32 bytes of PKCS#8 DER, last 32 bytes of SPKI DER
const privHex = privDer.slice(-32).toString('hex')
const pubHex = pubDer.slice(-32).toString('hex')

const keyFile = { private_key_hex: privHex, public_key_hex: pubHex }
writeFileSync('meter-key.json', JSON.stringify(keyFile, null, 2))

console.log('Meter keypair written to meter-key.json')
console.log('Public key (register this in Supabase meters.pubkey_hex):')
console.log(pubHex)
