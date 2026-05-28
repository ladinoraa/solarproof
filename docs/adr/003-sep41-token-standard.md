# ADR-003: SEP-41 Token Standard for Energy Certificates

**Date:** 2026-04-23  
**Status:** Accepted

## Context

Energy certificates (1 token = 1 kWh) must be transferable, burnable (retirement), and compatible with Stellar wallets and exchanges. The token standard must:

- Be recognised by Stellar ecosystem tooling (wallets, explorers, DEXes)
- Support mint, burn, and transfer operations
- Allow custom metadata (certificate provenance)

## Decision

Implement the `energy_token` contract following **SEP-41** (Stellar's fungible token standard), using **OpenZeppelin Stellar v0.5.1** as the base.

Token denomination: `1 token = 1 kWh`, with 7 decimal places (matching Stellar's stroop convention).

## Consequences

**Positive:**
- Freighter and other SEP-41-aware wallets display balances automatically
- Standard interface enables future DEX listing and cross-protocol composability
- OpenZeppelin base reduces custom security-critical code

**Negative:**
- SEP-41 is less battle-tested than ERC-20; interface may evolve
- 7-decimal stroop convention differs from typical ERC-20 18-decimal convention — integrators must be aware
