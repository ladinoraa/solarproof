import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract } from '@stellar/stellar-sdk'
import { SorobanRpc } from '@stellar/stellar-sdk'
import { kwhToStroops, amountToScVal, addressToScVal, bytesToScVal } from '@solarproof/stellar'
import { env } from '@/env'

const NETWORK_PASSPHRASE = Networks.TESTNET
const RPC_URL = 'https://soroban-testnet.stellar.org'

/** Delays that grow as 1 s, 2 s, 4 s for attempts 1, 2, 3. */
const BACKOFF_MS = [1_000, 2_000, 4_000]
const MAX_RETRIES = 3

function getServer() {
  return new SorobanRpc.Server(RPC_URL)
}

/**
 * Returns true for errors that are permanent and should NOT be retried:
 * - Invalid contract ID / WASM
 * - Authorization / auth failures
 * - Already-anchored duplicates
 * - Simulation errors (bad args)
 */
function isPermanentError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('invalid contract') ||
    msg.includes('contract not found') ||
    msg.includes('unauthorized') ||
    msg.includes('auth') ||
    msg.includes('alreadyanchored') ||
    msg.includes('reading already anchored') ||
    msg.includes('duplicate') ||
    msg.includes('simulation') ||
    msg.includes('invalid argument')
  )
}

/**
 * Run tracer-sim diagnosis on a failed transaction.
 * In production this would invoke the tracer-sim CLI; here we log a
 * structured diagnostic that operators can act on.
 */
function runTracerSimDiagnosis(operation: string, err: unknown): void {
  console.error('[tracer-sim] diagnosis triggered', {
    operation,
    error: err instanceof Error ? err.message : String(err),
    timestamp: new Date().toISOString(),
    hint: 'Run: stellar contract invoke --trace ... to replay the failed transaction',
  })
}

/**
 * Retry wrapper with exponential backoff.
 *
 * @param operation  Human-readable name for logging.
 * @param fn         Async function to retry.
 * @returns          Resolved value of `fn`.
 * @throws           Last error after all retries exhausted, after triggering tracer-sim.
 */
async function withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (isPermanentError(err)) {
        console.error(`[stellar] ${operation} permanent failure (no retry):`, err instanceof Error ? err.message : err)
        throw err
      }
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF_MS[attempt]
        console.warn(`[stellar] ${operation} attempt ${attempt + 1}/${MAX_RETRIES} failed, retrying in ${delay}ms:`, err instanceof Error ? err.message : err)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  console.error(`[stellar] ${operation} failed after ${MAX_RETRIES} retries`)
  runTracerSimDiagnosis(operation, lastErr)
  throw lastErr
}

async function submitTx(tx: ReturnType<typeof TransactionBuilder.prototype.build>, signer: Keypair) {
  const server = getServer()
  const prepared = await server.prepareTransaction(tx)
  prepared.sign(signer)
  const result = await server.sendTransaction(prepared)
  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`)
  }
  return result.hash
}

/**
 * Anchor a reading hash in the audit_registry contract.
 *
 * Only the 32-byte hash is stored on-chain (issue #59 optimisation).
 * The full payload (pubkey, signature, kwh, meter_id, timestamp) is
 * persisted off-chain in Supabase before this call.
 *
 * Retries up to 3 times with exponential backoff (1 s, 2 s, 4 s).
 * Permanent failures (invalid contract, duplicate) are not retried.
 * Final failure triggers tracer-sim diagnosis.
 */
export async function anchorReading(params: {
  readingHash: Buffer
}): Promise<string> {
  return withRetry('anchorReading', async () => {
    const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
    const server = getServer()
    const account = await server.getAccount(minter.publicKey())
    const contract = new Contract(env.NEXT_PUBLIC_AUDIT_REGISTRY_ID)

    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('anchor', bytesToScVal(params.readingHash)))
      .setTimeout(30)
      .build()

    return submitTx(tx, minter)
  })
}

/** Retire energy certificates on-chain (burns tokens, emits retire event). */
export async function retireCertificate(ownerAddress: string, kwh: number): Promise<string> {
  return withRetry('retireCertificate', async () => {
    const minter = Keypair.fromSecret(process.env.MINTER_SECRET_KEY!)
    const server = getServer()
    const account = await server.getAccount(minter.publicKey())
    const contract = new Contract(process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID!)

    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('retire', addressToScVal(ownerAddress), amountToScVal(kwhToStroops(kwh))))
      .setTimeout(30)
      .build()

    return submitTx(tx, minter)
  })
}

/** Mint energy certificates after a successful anchor.
 *
 * Retries up to 3 times with exponential backoff (1 s, 2 s, 4 s).
 * Permanent failures (invalid contract, auth) are not retried.
 * Final failure triggers tracer-sim diagnosis.
 */
export async function mintCertificates(recipientAddress: string, kwh: number): Promise<string> {
  return withRetry('mintCertificates', async () => {
    const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
    const server = getServer()
    const account = await server.getAccount(minter.publicKey())
    const contract = new Contract(env.NEXT_PUBLIC_ENERGY_TOKEN_ID)

    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('mint', addressToScVal(recipientAddress), amountToScVal(kwhToStroops(kwh))))
      .setTimeout(30)
      .build()

    return submitTx(tx, minter)
  })
}
