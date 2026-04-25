# Deployment Guide

This guide covers deploying SolarProof smart contracts to Stellar testnet and mainnet, verifying deployed bytecode on the Stellar explorer, and rolling back a bad deployment.

Deployed contract addresses are tracked in [docs/deployments.md](deployments.md).

---

## Prerequisites

- Rust toolchain pinned in `apps/contracts/rust-toolchain.toml`
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Stellar CLI: `cargo install --locked stellar-cli --features opt`
- A funded Stellar account (see below for testnet faucet)

---

## 1. Build contracts

```bash
cd apps/contracts
stellar contract build
```

Compiled WASM files are written to `target/wasm32-unknown-unknown/release/`.

---

## 2. Deploy to testnet

### 2a. Fund a deployer account

```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
# Or use the friendbot directly:
# curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

### 2b. Deploy each contract

```bash
TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/energy_token.wasm \
  --source deployer --network testnet)

REGISTRY_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/audit_registry.wasm \
  --source deployer --network testnet)

GOV_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/community_governance.wasm \
  --source deployer --network testnet)

echo "TOKEN_ID=$TOKEN_ID"
echo "REGISTRY_ID=$REGISTRY_ID"
echo "GOV_ID=$GOV_ID"
```

### 2c. Initialize each contract

```bash
ADMIN=$(stellar keys address deployer)

stellar contract invoke --id $TOKEN_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN --minter $ADMIN

stellar contract invoke --id $REGISTRY_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN

stellar contract invoke --id $GOV_ID --source deployer --network testnet \
  -- initialize --admin $ADMIN --quorum 51 --voting_period_ledgers 17280
```

### 2d. Record the addresses

Update [docs/deployments.md](deployments.md) with the three contract IDs, then set them in your environment:

All contract addresses and network settings are read from environment variables. Copy `.env.example` to `.env.local` and fill in the values from the deploy steps above.

### Testnet

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ENERGY_TOKEN_ID=<TOKEN_ID>
NEXT_PUBLIC_AUDIT_REGISTRY_ID=<REGISTRY_ID>
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID=<GOV_ID>
MINTER_SECRET_KEY=<deployer-secret>
```

---

## 3. Deploy to mainnet

> ⚠️ Mainnet deployments are irreversible. Use a hardware wallet or HSM-backed key for the deployer account.

The steps are identical to testnet — replace `--network testnet` with `--network mainnet` throughout.

```bash
stellar keys generate deployer-mainnet --network mainnet
# Fund from a real XLM source (no friendbot on mainnet)

TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/energy_token.wasm \
  --source deployer-mainnet --network mainnet)
# ... repeat for audit_registry and community_governance
```

Update [docs/deployments.md](deployments.md) with the mainnet contract IDs.

---

## 4. Automated deployment (CI)

The `.github/workflows/deploy-contracts.yml` workflow automates testnet deployment on pushes to `main`. It reads the deployer secret from the `DEPLOYER_SECRET` GitHub Actions secret and writes the resulting contract IDs back to the repository.

To trigger manually:

```
GitHub → Actions → Deploy Contracts → Run workflow
```

---

## 5. Verify deployed bytecode on Stellar Expert

After deployment, confirm the on-chain WASM matches your local build:

1. Open `https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>`
2. Click the **Contract** tab → **WASM** section.
3. Copy the **WASM hash** shown on the page.
4. Compute the hash of your local build:

```bash
sha256sum target/wasm32-unknown-unknown/release/energy_token.wasm
```

5. The two hashes must match. A mismatch means the on-chain contract was deployed from a different build.

---

## 6. Rollback procedure

Soroban contracts are immutable once deployed — you cannot overwrite a contract ID. The rollback procedure is:

1. **Deploy a new contract** from the corrected WASM (produces a new contract ID).
2. **Update environment variables** (`NEXT_PUBLIC_ENERGY_TOKEN_ID`, etc.) to point to the new contract ID.
3. **Redeploy the web app** (Vercel picks up the new env vars automatically on the next deployment).
4. **Update [docs/deployments.md](deployments.md)** with the new contract ID and a note explaining the rollback.
5. **Do not delete the old contract** — it remains on-chain as an audit record.

For the `audit_registry` contract specifically, all historical anchors remain valid on the old contract ID. The new deployment starts a fresh registry; existing certificates still resolve against the old contract via the `anchor_explorer` links stored in the database.

---

## 7. Register a meter after deployment

```bash
node scripts/gen-meter-key.mjs
# Insert the meter into Supabase:
# INSERT INTO meters (id, pubkey_hex, name, cooperative_id, active)
# VALUES (gen_random_uuid(), '<public_key_hex>', 'meter-name', '<coop-id>', true);
```

See [ONBOARDING.md](ONBOARDING.md) for the full end-to-end local setup.
