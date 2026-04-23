# ADR-002: Stellar/Soroban over EVM

**Date:** 2026-04-23  
**Status:** Accepted

## Context

SolarProof requires a smart contract platform to anchor meter readings and mint energy certificates. Key requirements:

- Low, predictable transaction fees (high-frequency meter anchoring)
- Native Ed25519 signature verification
- Deterministic execution for auditability
- Active ecosystem and tooling

## Decision

Deploy on **Stellar** using **Soroban** smart contracts.

## Consequences

**Positive:**
- Stellar's base fee (~0.00001 XLM) makes per-reading anchoring economically viable at scale
- Soroban provides `env.crypto().ed25519_verify()` natively — no external oracle or precompile needed
- Deterministic Wasm execution simplifies audit and replay via `tracer-sim`
- Stellar's 5-second ledger close time gives near-real-time anchoring

**Negative:**
- Smaller developer ecosystem than EVM — fewer off-the-shelf integrations
- Soroban is newer; some tooling is less mature than Ethereum equivalents
- Bridging to EVM-based certificate markets (I-REC, Energy Web) requires future work (Level 3 roadmap)
