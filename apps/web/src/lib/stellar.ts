import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract, Address, xdr } from '@stellar/stellar-sdk'
import * as SorobanRpc from '@stellar/stellar-sdk/rpc'
import { kwhToStroops, amountToScVal, addressToScVal, bytesToScVal } from '@solarproof/stellar'
import { env } from '@/env'

const NETWORK_PASSPHRASE = Networks.TESTNET
const RPC_URL = 'https://soroban-testnet.stellar.org'

function getServer() {
  return new SorobanRpc.Server(RPC_URL)
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
 */
export async function anchorReading(params: {
  readingHash: Buffer
}): Promise<string> {
  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(env.NEXT_PUBLIC_AUDIT_REGISTRY_ID)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('anchor', bytesToScVal(params.readingHash)))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}

/** Retire energy certificates on-chain (burns tokens, emits retire event). */
export async function retireCertificate(ownerAddress: string, kwh: number): Promise<string> {
  const minter = Keypair.fromSecret(process.env.MINTER_SECRET_KEY!)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID!)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('retire', addressToScVal(ownerAddress), amountToScVal(kwhToStroops(kwh))))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
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
export async function mintCertificates(recipientAddress: string, kwh: number): Promise<string> {
  await assertMintable(recipientAddress)

  const minter = Keypair.fromSecret(env.MINTER_SECRET_KEY)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(env.NEXT_PUBLIC_ENERGY_TOKEN_ID)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('mint', addressToScVal(recipientAddress), amountToScVal(kwhToStroops(kwh))))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}
