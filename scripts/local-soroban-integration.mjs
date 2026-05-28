#!/usr/bin/env node

import { createHash, createSign, randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Keypair } from '@stellar/stellar-sdk'
import { kwhToStroops } from '@solarproof/stellar'

const API_URL = process.env.API_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function ensureEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

ensureEnv('SUPABASE_URL', SUPABASE_URL)
ensureEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function computeReadingHash(meterId, kwhStroops, timestampUnix) {
  const meterBytes = Buffer.from(meterId, 'utf8')
  const kwhBuf = Buffer.alloc(8)
  kwhBuf.writeBigInt64LE(BigInt(kwhStroops))
  const tsBuf = Buffer.alloc(8)
  tsBuf.writeBigInt64LE(BigInt(timestampUnix))
  return createHash('sha256').update(meterBytes).update(kwhBuf).update(tsBuf).digest()
}

function signReading(readingHash, rawPrivateKey) {
  const privKeyDer = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'),
    rawPrivateKey,
  ])
  const signer = createSign('ed25519')
  signer.update(readingHash)
  return signer.sign({ key: privKeyDer, format: 'der', type: 'pkcs8' }).toString('hex')
}

async function postReading(payload) {
  const response = await fetch(`${API_URL}/api/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, ok: response.ok, data }
}

async function main() {
  console.log('Starting local integration test...')

  const meterKeypair = Keypair.random()
  const recipientKeypair = Keypair.random()
  const meterId = randomUUID()
  const cooperativeId = randomUUID()
  const kwh = 12.5
  const timestamp = Math.floor(Date.now() / 1000)

  const meterPubkeyHex = Buffer.from(meterKeypair.rawPublicKey()).toString('hex')
  const meterPrivateHex = Buffer.from(meterKeypair.rawSecretKey()).toString('hex')
  const recipientAddress = recipientKeypair.publicKey()

  console.log('Registering cooperative and meter in Supabase...')
  const { error: coopError } = await supabase.from('cooperatives').insert({
    id: cooperativeId,
    name: 'Local Soroban Integration Test Cooperative',
    admin_address: recipientAddress,
  })
  if (coopError) {
    throw new Error(`Failed to create cooperative: ${coopError.message}`)
  }

  const { error: meterError } = await supabase.from('meters').insert({
    id: meterId,
    cooperative_id: cooperativeId,
    serial_number: `local-test-meter-${Date.now()}`,
    pubkey_hex: meterPubkeyHex,
    active: true,
  })
  if (meterError) {
    throw new Error(`Failed to create meter: ${meterError.message}`)
  }

  const readingHash = computeReadingHash(meterId, kwhToStroops(kwh), BigInt(timestamp))
  const signatureHex = signReading(readingHash, Buffer.from(meterPrivateHex, 'hex'))

  console.log('Sending signed reading payload to API...')
  const { status, ok, data } = await postReading({
    meter_id: meterId,
    kwh,
    timestamp,
    signature_hex: signatureHex,
  })

  if (!ok) {
    throw new Error(`API request failed (${status}): ${JSON.stringify(data)}`)
  }

  console.log('API response:', data)
  if (!data?.reading_id || !data?.anchor_tx_hash || !data?.mint_tx_hash) {
    throw new Error('API did not return both anchor_tx_hash and mint_tx_hash')
  }

  const { data: readingRow, error: readingRowError } = await supabase
    .from('readings')
    .select('*')
    .eq('id', data.reading_id)
    .single()

  if (readingRowError || !readingRow) {
    throw new Error(`Failed to fetch reading row: ${readingRowError?.message}`)
  }

  if (!readingRow.anchored || !readingRow.minted) {
    throw new Error('Reading row was not marked as anchored and minted in the database')
  }

  const { data: certificateRow, error: certError } = await supabase
    .from('certificates')
    .select('*')
    .eq('reading_id', data.reading_id)
    .single()

  if (certError || !certificateRow) {
    throw new Error(`Certificate row was not created: ${certError?.message}`)
  }

  const certificateKwh = typeof certificateRow.kwh === 'string' ? Number(certificateRow.kwh) : certificateRow.kwh
  if (certificateKwh !== kwh) {
    throw new Error(`Certificate row kwh mismatch: expected ${kwh}, got ${certificateRow.kwh}`)
  }

  console.log('Integration test passed: reading anchored and token certificate minted successfully.')
  console.log('Meter public key:', meterPubkeyHex)
  console.log('Reading hash:', readingHash.toString('hex'))
  console.log('Anchor tx hash:', data.anchor_tx_hash)
  console.log('Mint tx hash:', data.mint_tx_hash)
}

main().catch((error) => {
  console.error('Integration test failed:', error)
  process.exit(1)
})
