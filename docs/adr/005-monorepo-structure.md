# ADR-005: Monorepo Structure with Turborepo + pnpm

**Date:** 2026-05-29  
**Status:** Accepted

## Context

SolarProof spans multiple concerns: Soroban smart contracts (Rust), a Next.js web app (TypeScript), shared Stellar utilities, and simulation scripts. These components share types, constants, and deployment artifacts. Managing them as separate repositories would require manual version synchronisation and make atomic cross-component changes difficult.

## Decision

Adopt a monorepo layout managed by **Turborepo** and **pnpm workspaces**:

```
solarproof/
├── apps/contracts/   # Rust / Soroban
├── apps/web/         # Next.js
├── packages/stellar/ # Shared TS utilities
└── scripts/          # Meter simulation
```

Turborepo handles task orchestration (build, lint, test) with remote caching. pnpm workspaces provide dependency hoisting and cross-package linking.

## Consequences

- **Easier:** atomic commits across contracts + web, shared type definitions, single CI pipeline, unified dependency updates.
- **Harder:** contributors need both Rust and Node toolchains; Turborepo cache invalidation must be tuned carefully to avoid stale builds.
