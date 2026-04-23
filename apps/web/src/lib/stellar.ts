import { Keypair, TransactionBuilder, Networks, BASE_FEE, Contract } from '@stellar/stellar-sdk'
import { SorobanRpc } from '@stellar/stellar-sdk'
import { kwhToStroops, amountToScVal, addressToScVal, bytesToScVal } from '@solarproof/stellar'
import { nativeToScVal } from '@stellar/stellar-sdk'

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

/** Anchor a signed reading hash in the audit_registry contract. */
export async function anchorReading(params: {
  readingHash: Buffer
  meterPubkeyHex: string
  signatureHex: string
  kwhStroops: bigint
  meterId: string
  timestampUnix: bigint
}): Promise<string> {
  const minter = Keypair.fromSecret(process.env.MINTER_SECRET_KEY!)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ID!)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(
      'anchor',
      bytesToScVal(params.readingHash),
      bytesToScVal(Buffer.from(params.meterPubkeyHex, 'hex')),
      bytesToScVal(Buffer.from(params.signatureHex, 'hex')),
      amountToScVal(params.kwhStroops),
      nativeToScVal(params.meterId, { type: 'string' }),
      nativeToScVal(params.timestampUnix, { type: 'u64' }),
    ))
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

/** Mint energy certificates after a successful anchor. */
export async function mintCertificates(recipientAddress: string, kwh: number): Promise<string> {
  const minter = Keypair.fromSecret(process.env.MINTER_SECRET_KEY!)
  const server = getServer()
  const account = await server.getAccount(minter.publicKey())
  const contract = new Contract(process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID!)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call('mint', addressToScVal(recipientAddress), amountToScVal(kwhToStroops(kwh))))
    .setTimeout(30)
    .build()

  return submitTx(tx, minter)
}
