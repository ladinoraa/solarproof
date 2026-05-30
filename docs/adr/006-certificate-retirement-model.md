# ADR-006: Certificate Retirement Model

**Date:** 2026-05-29  
**Status:** Accepted

## Context

Energy certificates (RECs) must be retired — permanently consumed — to prevent double-counting. The retirement event must be publicly auditable and irreversible. Options considered:

1. **Burn to zero address** — transfer token to `0x000…` (EVM convention, not idiomatic on Stellar).
2. **Contract-managed burn** — `energy_token` contract exposes a `retire(amount, beneficiary)` function that destroys the balance and emits an on-chain event.
3. **Off-chain registry** — record retirement in a database only.

## Decision

Use **contract-managed burn** (option 2). The `energy_token` contract's `retire` function:

- Decrements the caller's balance permanently (no re-mint path).
- Records `(beneficiary, kwh, timestamp, tx_hash)` in the `audit_registry` contract for public verification.
- Emits a Soroban event consumed by the public verifier UI.

## Consequences

- **Easier:** retirement is cryptographically final and publicly verifiable without trusting SolarProof's database; the verifier at `/verify` can reconstruct the full chain.
- **Harder:** retired tokens cannot be recovered if a user retires by mistake; UX must include a confirmation step with clear warnings.
