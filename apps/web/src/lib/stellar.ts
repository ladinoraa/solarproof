import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract, Address, xdr } from '@stellar/stellar-sdk'
import * as SorobanRpc from '@stellar/stellar-sdk/rpc'
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

/** Delays that grow as 1 s, 2 s, 4 s for attempts 1, 2, 3. */
const BACKOFF_MS = [1_000, 2_000, 4_000]
const MAX_RETRIES = 3

/** Return a Soroban RPC server pointed at the testnet endpoint. */
function getServer() {
  return new SorobanRpc.Server(env.NEXT_PUBLIC_STELLAR_RPC_URL)
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

/**
 * Pre-flight check before minting: verifies the recipient account exists on
 * Stellar and has established a trustline for the energy_token contract.
 *
 * Throws a descriptive error with setup instructions if either check fails.
 */
export async function assertMintable(recipientAddress: string): Promise<void> {
  const server = getServer()

  // 1. Check account exists (Soroban RPC throws if not found)
  try {
    await server.getAccount(recipientAddress)
  } catch {
    throw new Error(
      `Recipient account ${recipientAddress} does not exist on Stellar. ` +
      `The account must be funded (minimum 1 XLM) before certificates can be minted. ` +
      `Fund it at https://laboratory.stellar.org/#account-creator?network=test`
    )
  }

  // 2. Check SAC trustline: a Balance entry must exist in the energy_token contract storage
  const recipientScAddress = Address.account(Keypair.fromPublicKey(recipientAddress).rawPublicKey())
  const balanceKey = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('Balance'),
      val: recipientScAddress.toScVal(),
    }),
  ])

  try {
    await server.getContractData(env.NEXT_PUBLIC_ENERGY_TOKEN_ID, balanceKey, SorobanRpc.Durability.Persistent)
  } catch {
    throw new Error(
      `Recipient account ${recipientAddress} has no trustline for the energy_token contract (${env.NEXT_PUBLIC_ENERGY_TOKEN_ID}). ` +
      `The account holder must call \`add_trustline\` on the contract to establish a trustline before certificates can be minted.`
    )
  }
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
