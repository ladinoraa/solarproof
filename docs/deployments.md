# Contract Deployments

Deployed contract addresses for each environment. Update this file after every deployment.

---

## Staging (Testnet)

Staging uses Stellar **Testnet** and a separate Supabase project. See [docs/STAGING.md](./STAGING.md) for setup.

| Contract | Contract ID | Deployed At | Deployed By |
|---|---|---|---|
| `energy_token` | _(set after first staging deploy)_ | — | — |
| `audit_registry` | _(set after first staging deploy)_ | — | — |
| `community_governance` | _(set after first staging deploy)_ | — | — |

Explorer: `https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>`

---

## Testnet

| Contract | Contract ID | Deployed At | Deployed By |
|---|---|---|---|
| `energy_token` | _(set after first deploy)_ | — | — |
| `audit_registry` | _(set after first deploy)_ | — | — |
| `community_governance` | _(set after first deploy)_ | — | — |

Explorer: `https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>`

## Mainnet

| Contract | Contract ID | Deployed At | Deployed By |
|---|---|---|---|
| `energy_token` | _(not yet deployed)_ | — | — |
| `audit_registry` | _(not yet deployed)_ | — | — |
| `community_governance` | _(not yet deployed)_ | — | — |

Explorer: `https://stellar.expert/explorer/public/contract/<CONTRACT_ID>`

---

> **How to update this file:** After running the deploy workflow (or manual deploy steps below), paste the contract IDs returned by `stellar contract deploy` into the table above and commit the change.

---

## Mainnet Deployment Process

### Prerequisites

- [ ] Contract audits complete (see `docs/AUDIT_SCOPE.md`)
- [ ] Deployment checklist reviewed and signed off by two maintainers
- [ ] Admin keypair stored in a hardware wallet (Ledger / YubiKey) or HSM
- [ ] Deployer account funded with sufficient XLM for deployment fees (~10 XLM per contract)
- [ ] `stellar` CLI installed and configured for `mainnet`

### Key Management

**Admin key** — controls `set_minter`, `set_api_signer`, and governance admin functions.
Store in a hardware wallet. Never export the private key to disk or CI.

**Deployer key** — used only during deployment to pay fees. Rotate after deployment.
Store in a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault).

**Minter key** — used by the SolarProof API to call `energy_token.mint()`.
Store as a GitHub Actions secret (`MINTER_SECRET_KEY`). Rotate quarterly.

### Environment Separation

| Variable | Testnet | Mainnet |
|---|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | `mainnet` |
| `NEXT_PUBLIC_ENERGY_TOKEN_ID` | testnet contract ID | mainnet contract ID |
| `NEXT_PUBLIC_AUDIT_REGISTRY_ID` | testnet contract ID | mainnet contract ID |
| `NEXT_PUBLIC_COMMUNITY_GOVERNANCE_ID` | testnet contract ID | mainnet contract ID |
| `MINTER_SECRET_KEY` | testnet keypair | mainnet keypair (HSM-backed) |

Testnet and mainnet configs are kept in separate GitHub Actions environments (`staging` and `production`). Never share secrets between environments.

### Deployment Steps

1. **Build contracts**
   ```bash
   cd apps/contracts
   stellar contract build
   ```

2. **Run the mainnet deploy script**
   ```bash
   DEPLOYER_SECRET_KEY=<your-deployer-key> \
   CONFIRM_MAINNET=yes \
   ./scripts/deploy-mainnet.sh
   ```
   The script is idempotent — it skips contracts already listed in `scripts/deployments/mainnet.json`.

3. **Record contract addresses**
   Copy the contract IDs from `scripts/deployments/mainnet.json` into the Mainnet table above and commit.

4. **Initialize contracts**
   After deployment, call `initialize` on each contract with the correct admin and minter addresses:
   ```bash
   stellar contract invoke \
     --id <ENERGY_TOKEN_ID> \
     --source <ADMIN_KEY> \
     --network mainnet \
     -- initialize \
     --admin <ADMIN_ADDRESS> \
     --minter <MINTER_ADDRESS>
   ```
   Repeat for `audit_registry` (with `api_signer`) and `community_governance`.

5. **Update environment variables**
   Set the mainnet contract IDs in the `production` GitHub Actions environment and in Vercel.

6. **Verify deployment**
   ```bash
   stellar contract invoke \
     --id <ENERGY_TOKEN_ID> \
     --network mainnet \
     -- name
   ```
   Expected output: `"SolarProof kWh"`

### Deployment Checklist

- [ ] Contracts built from a tagged release commit (not a development branch)
- [ ] Contract audit report reviewed; all critical/high findings resolved
- [ ] Admin address is a hardware-wallet-controlled account
- [ ] Minter address is the production API keypair
- [ ] `initialize` called on all three contracts
- [ ] Contract IDs recorded in this file and committed
- [ ] Mainnet environment variables updated in Vercel and GitHub Actions
- [ ] Smoke test passed: send a test meter reading end-to-end
- [ ] Deployment signed off by two maintainers (record names and date below)

**Sign-off:**
| Name | Date | Role |
|---|---|---|
| | | Deployer |
| | | Reviewer |
