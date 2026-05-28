# ADR-001: Ed25519 for Meter Signing

**Date:** 2026-04-23  
**Status:** Accepted

## Context

Smart meters must cryptographically sign energy readings before transmission to prevent tampering and enable public verification. The signing scheme must be:

- Secure against forgery
- Efficient on embedded hardware
- Compatible with Stellar/Soroban's native verification primitives
- Widely supported in standard libraries

## Decision

Use **Ed25519** for all meter signatures.

Each meter device holds a unique Ed25519 keypair. Readings are signed as:

```
signature = Ed25519_sign(private_key, SHA-256(meter_id || kwh_stroops || timestamp))
```

The signature is verified on-chain by the `audit_registry` contract using Soroban's `env.crypto().ed25519_verify()`.

## Consequences

**Positive:**
- Native Soroban support — no custom crypto needed
- Fast verification (~50μs on-chain)
- Small signatures (64 bytes) and keys (32 bytes)
- Deterministic signatures prevent replay attacks when combined with timestamp

**Negative:**
- Requires secure key storage on meter hardware (mitigated by future HSM integration)
- Not quantum-resistant (acceptable for current threat model; can migrate to post-quantum schemes in future contract versions)
