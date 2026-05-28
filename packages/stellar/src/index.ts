import {
  Contract, Networks, SorobanRpc, TransactionBuilder,
  BASE_FEE, xdr, nativeToScVal, scValToNative, Address,
} from '@stellar/stellar-sdk'

export const NETWORKS = {
  testnet: {
    networkPassphrase: Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    networkPassphrase: Networks.PUBLIC,
    rpcUrl: 'https://soroban-mainnet.stellar.org',
  },
} as const

export type NetworkName = keyof typeof NETWORKS

export const CONTRACT_IDS: Record<NetworkName, Record<string, string>> = {
  testnet: {
    energy_token: process.env.NEXT_PUBLIC_ENERGY_TOKEN_ID ?? '',
    audit_registry: process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ID ?? '',
    community_governance: process.env.NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID ?? '',
  },
  mainnet: { energy_token: '', audit_registry: '', community_governance: '' },
}

export function getRpcServer(network: NetworkName = 'testnet') {
  return new SorobanRpc.Server(NETWORKS[network].rpcUrl, { allowHttp: false })
}

export async function buildTransaction(
  server: SorobanRpc.Server,
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  network: NetworkName = 'testnet'
) {
  const account = await server.getAccount(sourcePublicKey)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[network].networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build()
  return server.prepareTransaction(tx)
}

export { nativeToScVal, scValToNative, Address }

export function addressToScVal(address: string): xdr.ScVal {
  return nativeToScVal(Address.fromString(address), { type: 'address' })
}

export function amountToScVal(amount: bigint): xdr.ScVal {
  return nativeToScVal(amount, { type: 'i128' })
}

export function bytesToScVal(bytes: Uint8Array): xdr.ScVal {
  return nativeToScVal(bytes, { type: 'bytes' })
}

/** Convert kWh to token stroops (1 kWh = 10^7 stroops) */
export const kwhToStroops = (kwh: number): bigint => BigInt(Math.round(kwh * 1e7))

/** Convert token stroops to kWh */
export const stroopsToKwh = (stroops: bigint): number => Number(stroops) / 1e7

/** Build a stellar.expert deep link for a transaction or contract address. */
export function stellarExplorerUrl(
  type: 'tx' | 'contract',
  id: string,
  network: NetworkName = 'testnet'
): string {
  const net = network === 'mainnet' ? 'public' : 'testnet'
  const path = type === 'tx' ? 'tx' : 'contract'
  return `https://stellar.expert/explorer/${net}/${path}/${id}`
}
