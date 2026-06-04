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
