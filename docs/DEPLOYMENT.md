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

```env
NEXT_PUBLIC_ENERGY_TOKEN_ID=<TOKEN_ID>
NEXT_PUBLIC_AUDIT_REGISTRY_ID=<REGISTRY_ID>
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID=<GOV_ID>
MINTER_SECRET_KEY=<MINTER_SECRET>
```

## 5. Register a meter

```bash
node scripts/gen-meter-key.mjs
# Insert meter into Supabase with the generated public_key_hex
```

## 6. Smoke test and recovery

- Run the automated smoke test after deployment:

```bash
pnpm exec node scripts/smoke-test.mjs
```

- Refer to `docs/backup-recovery.md` for Supabase backup, restore, RTO, RPO, and retention policies.
- Refer to `docs/CONTRACT_INTERFACE_DOCS.md` for Soroban contract interfaces, parameter details, and Stellar CLI examples.
