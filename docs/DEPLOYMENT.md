# Deployment Guide

## 1. Build contracts

```bash
cd apps/contracts
stellar contract build
```

## 2. Deploy

```bash
TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/energy_token.wasm \
  --source YOUR_SECRET --network testnet)

REGISTRY_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/audit_registry.wasm \
  --source YOUR_SECRET --network testnet)

GOV_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/community_governance.wasm \
  --source YOUR_SECRET --network testnet)
```

## 3. Initialize

```bash
stellar contract invoke --id $TOKEN_ID --source YOUR_SECRET --network testnet \
  -- initialize --admin ADMIN_ADDRESS --minter MINTER_ADDRESS

stellar contract invoke --id $REGISTRY_ID --source YOUR_SECRET --network testnet \
  -- initialize --admin ADMIN_ADDRESS

stellar contract invoke --id $GOV_ID --source YOUR_SECRET --network testnet \
  -- initialize --admin ADMIN_ADDRESS --quorum 51 --voting_period_ledgers 17280
```

## 4. Environment variables

All contract addresses and network settings are read from environment variables. Copy `.env.example` to `.env.local` and fill in the values from the deploy steps above.

### Testnet

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ENERGY_TOKEN_ID=<TOKEN_ID>
NEXT_PUBLIC_AUDIT_REGISTRY_ID=<REGISTRY_ID>
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID=<GOV_ID>
MINTER_SECRET_KEY=<MINTER_SECRET>
```

### Mainnet

```env
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
NEXT_PUBLIC_ENERGY_TOKEN_ID=<MAINNET_TOKEN_ID>
NEXT_PUBLIC_AUDIT_REGISTRY_ID=<MAINNET_REGISTRY_ID>
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID=<MAINNET_GOV_ID>
MINTER_SECRET_KEY=<MAINNET_MINTER_SECRET>
```

> **Vercel:** set these in *Project → Settings → Environment Variables*, scoped to the appropriate environment (Preview for testnet, Production for mainnet). Never commit `.env.local` or any file containing `MINTER_SECRET_KEY`.

## 5. Register a meter

```bash
node scripts/gen-meter-key.mjs
# Insert meter into Supabase with the generated public_key_hex
```
