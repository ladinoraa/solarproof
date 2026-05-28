# ADR-004: Cooperative Governance Model

**Date:** 2026-04-23  
**Status:** Accepted

## Context

SolarProof must support decentralised decision-making for:

- Contract upgrades
- Quorum and voting period adjustments
- Meter registration policy changes
- Future protocol parameters

The governance model must balance accessibility (low barrier to participation) with security (prevent Sybil attacks).

## Decision

Implement a **cooperative governance** contract with:

- **One-address-one-vote** (not token-weighted)
- Proposals require a simple majority (configurable quorum, default 51%)
- Voting period: 17,280 ledgers (~24 hours on Stellar)
- Any address can propose; only addresses that have interacted with the protocol (minted, burned, or anchored) can vote (future enhancement)

## Consequences

**Positive:**
- Democratic participation — small meter operators have equal voice to large ones
- Simple, transparent voting logic
- Prevents plutocracy (token-weighted governance favours whales)

**Negative:**
- Vulnerable to Sybil attacks (one entity creating many addresses) — mitigated by future requirement that voters must have on-chain activity
- Lower capital efficiency than token-weighted governance (no staking incentive)
- Quorum may be hard to reach in early stages — can be adjusted via governance itself
