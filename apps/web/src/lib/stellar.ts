import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract } from '@stellar/stellar-sdk'
import { SorobanRpc } from '@stellar/stellar-sdk'
import { kwhToStroops, amountToScVal, addressToScVal, bytesToScVal } from '@solarproof/stellar'

const NETWORK_PASSPHRASE = Networks.TESTNET
const RPC_URL = 'https://soroban-testnet.stellar.org'

/** Return a Soroban RPC server pointed at the testnet endpoint. */
function getServer() {
  return new SorobanRpc.Server(RPC_URL)
}

/**
 * Sign and submit a prepared Soroban transaction.
 *
 * The transaction must already be simulated (via `server.prepareTransaction`)
 * before calling this helper — raw transactions are rejected by the network.
 *
 * Throws if the network returns `status === 'ERROR'` so callers can surface
 * the failure without having to inspect the result object themselves.
 *
 * @param tx - A prepared (simulated + fee-bumped) transaction.
 * @param signer - Keypair used to sign the transaction.
 * @returns The transaction hash on success.
 */
async function submitTx(tx: ReturnType<typeof TransactionBuilder.prototype.build>, signer: Keypair) {
  const server = getServer()
  const prepared = await server.prepareTransaction(tx)
  prepared.sign(signer)

  const result = await server.sendTransaction(prepared)

  // 'ERROR' is a terminal state — the transaction was rejected by the network.
  // Other non-success statuses (e.g. 'PENDING') indicate the tx is in-flight
  // and would require polling, but we treat them as success here since the hash
  // is available for the caller to track.
  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`)
  }

  return result.hash
}

/**
 * Anchor a meter reading hash in the `audit_registry` contract.
 *
 * Only the 32-byte SHA-256 hash is stored on-chain (issue #59 optimisation).
 * The full payload (pubkey, signature, kwh, meter_id, timestamp) is persisted
 * off-chain in Supabase **before** this call so that the hash is always
 * verifiable even if the API is unavailable.
 *
 * @param params.readingHash - 32-byte SHA-256 digest of the canonical reading payload.
 * @returns Stellar transaction hash of the anchor operation.
 */
export async function anchorReading(params: { readingHash: Buffer }): Promise<string> {
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(env.NEXT_PUBLIC_AUDIT_REGISTRY_ID)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('anchor', bytesToScVal(params.readingHash)))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}

/**
 * Retire (burn) energy certificates on behalf of a certificate holder.
 *
 * Retirement is irreversible — it permanently removes tokens from circulation
 * and emits a `retire` event on-chain, which regulators can use to confirm
 * that the energy was consumed and not double-counted.
 *
 * The minter account signs the retirement transaction because the `retire()`
 * contract function requires minter authority (it burns tokens from the
 * owner's balance on their behalf).
 *
 * @param ownerAddress - Stellar G-address of the certificate holder.
 * @param kwh - Amount of energy (in kWh) to retire.
 * @returns Stellar transaction hash of the retire operation.
 */
export async function retireCertificate(ownerAddress: string, kwh: number): Promise<string> {
  const minter = Keypair.fromSecret(process.env.MINTER_SECRET_KEY!)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID!)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'retire',
        addressToScVal(ownerAddress),
        // Convert kWh to stroops (1 kWh = 10^7 stroops) before encoding as i128.
        // The contract stores all amounts in stroops to avoid floating-point on-chain.
        amountToScVal(kwhToStroops(kwh))
      )
    )
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}

/**
 * Mint energy certificates to a recipient after a successful anchor.
 *
 * Minting is always preceded by `anchorReading()` — the anchor proves the
 * reading is genuine before any tokens are created. Calling this function
 * without a prior anchor would violate the protocol invariant.
 *
 * @param recipientAddress - Stellar G-address of the certificate recipient.
 * @param kwh - Amount of energy (in kWh) to mint as certificates.
 * @returns Stellar transaction hash of the mint operation.
 */
export async function mintCertificates(recipientAddress: string, kwh: number): Promise<string> {
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(env.NEXT_PUBLIC_ENERGY_TOKEN_ID)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'mint',
        addressToScVal(recipientAddress),
        amountToScVal(kwhToStroops(kwh))
      )
    )
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}
