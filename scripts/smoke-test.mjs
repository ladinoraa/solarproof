import crypto from 'crypto'
import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
} from '@stellar/stellar-sdk'
import {
  getRpcServer,
  NETWORKS,
  addressToScVal,
  amountToScVal,
  bytesToScVal,
  kwhToStroops,
  nativeToScVal,
} from '@solarproof/stellar'

function loadEnv(name, required = true) {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function stringToScVal(value) {
  return nativeToScVal(value, { type: 'string' })
}

async function buildAndSubmit({server, secret, contractId, method, args, network}) {
  const keypair = Keypair.fromSecret(secret)
  const account = await server.getAccount(keypair.publicKey())
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[network].networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(60)
    .build()

  tx.sign(keypair)
  const envelope = tx.toEnvelope().toXDR('base64')
  const result = await server.sendTransaction(envelope)
  return result
}

async function verifyAnchor({server, secret, contractId, readingHash, network}) {
  console.log('Verifying audit anchor on audit_registry...')
  return buildAndSubmit({
    server,
    secret,
    contractId,
    method: 'verify',
    network,
    args: [bytesToScVal(readingHash)],
  })
}

async function checkTokenBalance({server, secret, contractId, account, network}) {
  console.log('Checking energy token balance for recipient...')
  return buildAndSubmit({
    server,
    secret,
    contractId,
    method: 'balance',
    network,
    args: [addressToScVal(account)],
  })
}

async function run() {
  const network = process.env.SMOKE_NETWORK || 'testnet'
  const server = getRpcServer(network)

  const meterSecret = loadEnv('SMOKE_METER_SECRET_KEY')
  const minterSecret = loadEnv('SMOKE_TOKEN_MINTER_SECRET_KEY')
  const energyTokenId = loadEnv('ENERGY_TOKEN_ID')
  const auditRegistryId = loadEnv('AUDIT_REGISTRY_ID')

  const meterKeypair = Keypair.fromSecret(meterSecret)
  const recipientKeypair = Keypair.random()

  const readingHash = crypto.randomBytes(32)
  const signature = meterKeypair.sign(readingHash)
  const meterId = 'STAGING-METER-001'
  const kwh = 1
  const kwhStroops = kwhToStroops(kwh)
  const timestamp = BigInt(Math.floor(Date.now() / 1000))

  console.log('Submitting audit anchor to audit_registry...')
  const anchorResult = await buildAndSubmit({
    server,
    secret: meterSecret,
    contractId: auditRegistryId,
    method: 'anchor',
    network,
    args: [
      bytesToScVal(readingHash),
      bytesToScVal(meterKeypair.rawPublicKey()),
      bytesToScVal(signature),
      amountToScVal(kwhStroops),
      stringToScVal(meterId),
      nativeToScVal(timestamp, { type: 'u64' }),
    ],
  })

  console.log('Audit anchor transaction result:', JSON.stringify(anchorResult, null, 2))

  await verifyAnchor({
    server,
    secret: meterSecret,
    contractId: auditRegistryId,
    readingHash,
    network,
  })

  console.log('Minting energy certificate token...')
  const mintResult = await buildAndSubmit({
    server,
    secret: minterSecret,
    contractId: energyTokenId,
    method: 'mint',
    network,
    args: [
      addressToScVal(recipientKeypair.publicKey()),
      amountToScVal(kwhStroops),
    ],
  })

  console.log('Mint transaction result:', JSON.stringify(mintResult, null, 2))

  await checkTokenBalance({
    server,
    secret: minterSecret,
    contractId: energyTokenId,
    account: recipientKeypair.publicKey(),
    network,
  })

  console.log(`Certificate minted to ${recipientKeypair.publicKey()}`)
  console.log('Smoke test completed successfully.')
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
