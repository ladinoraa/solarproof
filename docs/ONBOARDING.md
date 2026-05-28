# Developer Onboarding Guide

Welcome to SolarProof. This guide gets you from zero to a running local environment with a simulated meter reading end-to-end.

---

## Prerequisites

Install the following before cloning:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v22+ | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm | v10+ | `npm install -g pnpm@10` |
| Rust + Cargo | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install --locked stellar-cli --features opt` |

Verify:

```bash
node --version      # v22.x.x
pnpm --version      # 10.x.x
cargo --version     # cargo 1.x.x
stellar --version   # stellar x.x.x
```

---

## 1. Clone and install

```bash
git clone https://github.com/AnnabelJoe/solarproof.git
cd solarproof
pnpm install
```

---

## 2. Environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_ENERGY_TOKEN_ID=        # from contract deployment
NEXT_PUBLIC_AUDIT_REGISTRY_ID=      # from contract deployment
NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID= # from contract deployment
MINTER_SECRET_KEY=                  # from contract deployment
```

For contract IDs, see [Deploying contracts locally](#4-deploying-contracts-locally) below, or ask a teammate for the shared testnet IDs.

---

## 3. Run the web app

```bash
pnpm dev
```

Opens at [http://localhost:3000](http://localhost:3000).

---

## 4. Deploying contracts locally

Build all three contracts:

```bash
cd apps/contracts
stellar contract build
```

Deploy to Stellar testnet (requires a funded testnet account):

```bash
# Fund a testnet account
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# Deploy
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

Initialize each contract:

```bash
stellar contract invoke --id $TOKEN_ID --source deployer --network testnet \
  -- initialize --admin $(stellar keys address deployer) --minter $(stellar keys address deployer)

stellar contract invoke --id $REGISTRY_ID --source deployer --network testnet \
  -- initialize --admin $(stellar keys address deployer)

stellar contract invoke --id $GOV_ID --source deployer --network testnet \
  -- initialize --admin $(stellar keys address deployer) --quorum 51 --voting_period_ledgers 17280
```

Copy the IDs into `apps/web/.env.local`.

---

## 5. Running tests

### Web (lint + type-check + build)

```bash
pnpm lint              # ESLint
pnpm type-check        # TypeScript
pnpm build             # Next.js production build
```

Run from `apps/web/` or from the repo root (Turborepo runs all).

### Contracts (fmt + clippy + tests)

```bash
cd apps/contracts
cargo fmt --all -- --check   # formatting
cargo clippy --all-targets   # lints
cargo test --all             # unit tests
```

---

## 6. Simulate a meter reading end-to-end

This sends a signed reading through the full stack: script → API → Stellar.

**Step 1 — Generate a meter keypair:**

```bash
node scripts/gen-meter-key.mjs
# Outputs meter-key.json with public_key_hex and private_key_hex
```

**Step 2 — Register the meter in Supabase:**

Insert a row into the `meters` table with the `public_key_hex` from step 1. You can do this via the Supabase dashboard or SQL:

```sql
INSERT INTO meters (id, public_key_hex, name) VALUES (gen_random_uuid(), '<public_key_hex>', 'dev-meter');
```

**Step 3 — Start the dev server** (if not already running):

```bash
pnpm dev
```

**Step 4 — Send a signed reading:**

```bash
node scripts/send-reading.mjs \
  --meter-id <uuid-from-step-2> \
  --kwh 12.5 \
  --key ./meter-key.json \
  --api http://localhost:3000
```

Expected output:

```
Sending reading: { meterId: '...', kwh: 12.5, timestamp: ... }
Reading hash: <hex>
✓ Success: { anchor_tx: '...', token_tx: '...' }
```

**Step 5 — Verify on-chain:**

Open [http://localhost:3000/verify](http://localhost:3000/verify) and enter the reading hash or token transaction ID.

---

## 7. Troubleshooting

**`pnpm install` fails with peer dependency errors**
→ Ensure Node.js v22+ is active: `node --version`

**`stellar contract build` fails with `wasm32-unknown-unknown` not found**
→ Run: `rustup target add wasm32-unknown-unknown`

**`stellar keys fund` returns an error**
→ Testnet friendbot may be rate-limited. Try: `curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"`

**API returns `invalid signature`**
→ The `meter_id` passed to `send-reading.mjs` must exactly match the UUID registered in Supabase. UUIDs are case-sensitive.

**`cargo test` fails with `ed25519` import errors**
→ Ensure you're using the `soroban-sdk` version pinned in `apps/contracts/Cargo.toml`. Run `cargo update` only if explicitly needed.

**Next.js build fails with missing env vars**
→ All `NEXT_PUBLIC_*` vars must be set at build time. Check `apps/web/.env.local` exists and is populated.

---

## Project structure recap

```
solarproof/
├── apps/
│   ├── contracts/          # Soroban smart contracts (Rust)
│   │   ├── energy_token/
│   │   ├── audit_registry/
│   │   └── community_governance/
│   └── web/                # Next.js app + API routes
├── packages/stellar/       # Shared Stellar client utilities
├── scripts/                # Meter simulation scripts
└── docs/                   # Deployment guide, ADRs, database schema
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commit conventions and PR workflow.
