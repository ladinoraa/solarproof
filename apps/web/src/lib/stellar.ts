import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract } from '@stellar/stellar-sdk'
import { SorobanRpc } from '@stellar/stellar-sdk'
import { kwhToStroops, amountToScVal, addressToScVal, bytesToScVal } from '@solarproof/stellar'
import { env } from '@/env'

const NETWORK_PASSPHRASE = Networks.TESTNET
const RPC_URL = 'https://soroban-testnet.stellar.org'
const RPC_TIMEOUT_MS = 10_000

// ---------------------------------------------------------------------------
// Circuit breaker — opens after 5 consecutive timeouts, resets after 60 s
// ---------------------------------------------------------------------------
const CB = {
  failures: 0,
  openUntil: 0,
  THRESHOLD: 5,
  RESET_MS: 60_000,
}

export class StellarTimeoutError extends Error {
  readonly correlationId: string
  constructor(correlationId: string) {
    super(`Stellar RPC timeout [${correlationId}]`)
    this.name = 'StellarTimeoutError'
    this.correlationId = correlationId
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfter: number
  constructor(retryAfter: number) {
    super('Stellar RPC circuit open — too many recent timeouts')
    this.name = 'CircuitOpenError'
    this.retryAfter = retryAfter
  }
}

function checkCircuit() {
  if (CB.openUntil && Date.now() < CB.openUntil) {
    throw new CircuitOpenError(Math.ceil((CB.openUntil - Date.now()) / 1000))
  }
  if (CB.openUntil && Date.now() >= CB.openUntil) {
    CB.failures = 0
    CB.openUntil = 0
  }
}

function recordSuccess() {
  CB.failures = 0
  CB.openUntil = 0
}

function recordFailure(correlationId: string) {
  CB.failures++
  console.error(`[stellar] timeout correlationId=${correlationId} failures=${CB.failures}`)
  if (CB.failures >= CB.THRESHOLD) {
    CB.openUntil = Date.now() + CB.RESET_MS
    console.error(`[stellar] circuit opened until ${new Date(CB.openUntil).toISOString()}`)
  }
}

/** Wrap a promise with a timeout. Throws StellarTimeoutError on expiry. */
async function withTimeout<T>(promise: Promise<T>, correlationId: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StellarTimeoutError(correlationId)), RPC_TIMEOUT_MS)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch (err) {
    clearTimeout(timer!)
    throw err
  }
}

/** Execute an RPC call with timeout + circuit breaker. */
async function rpcCall<T>(fn: () => Promise<T>, correlationId: string): Promise<T> {
  checkCircuit()
  try {
    const result = await withTimeout(fn(), correlationId)
    recordSuccess()
    return result
  } catch (err) {
    if (err instanceof StellarTimeoutError) {
      recordFailure(correlationId)
    }
    throw err
  }
}

function getServer() {
  return new SorobanRpc.Server(RPC_URL)
}

async function submitTx(
  tx: ReturnType<typeof TransactionBuilder.prototype.build>,
  signer: Keypair,
  correlationId: string
) {
  const server = getServer()
  const prepared = await rpcCall(() => server.prepareTransaction(tx), correlationId)
  prepared.sign(signer)
  const result = await rpcCall(() => server.sendTransaction(prepared), correlationId)
  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`)
  }
  return result.hash
}

/**
 * Anchor a reading hash in the audit_registry contract.
 */
export async function anchorReading(params: {
  readingHash: Buffer
  correlationId?: string
}): Promise<string> {
  const correlationId = params.correlationId ?? crypto.randomUUID()
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await rpcCall(() => server.getAccount(minter.publicKey()), correlationId)
  const contract = new Contract(env.NEXT_PUBLIC_AUDIT_REGISTRY_ID)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('anchor', bytesToScVal(params.readingHash)))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter, correlationId)
}

/** Retire energy certificates on-chain. */
export async function retireCertificate(
  ownerAddress: string,
  kwh: number,
  correlationId = crypto.randomUUID()
): Promise<string> {
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await rpcCall(() => server.getAccount(minter.publicKey()), correlationId)
  const contract = new Contract(env.NEXT_PUBLIC_ENERGY_TOKEN_ID)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('retire', addressToScVal(ownerAddress), amountToScVal(kwhToStroops(kwh))))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter, correlationId)
}

/** Mint energy certificates after a successful anchor. */
export async function mintCertificates(
  recipientAddress: string,
  kwh: number,
  correlationId = crypto.randomUUID()
): Promise<string> {
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await rpcCall(() => server.getAccount(minter.publicKey()), correlationId)
  const contract = new Contract(env.NEXT_PUBLIC_ENERGY_TOKEN_ID)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('mint', addressToScVal(recipientAddress), amountToScVal(kwhToStroops(kwh))))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter, correlationId)
}
