# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Maintenance note:** This file is updated automatically by
> [semantic-release](https://github.com/semantic-release/semantic-release) on every
> release from `main`. To add an entry manually, follow the format below and open a PR.

---

## [Unreleased]

### Added
- STRIDE-based threat model (`docs/THREAT_MODEL.md`) covering 13 attack vectors across all 6 STRIDE categories (#110)
- TSDoc comments and inline explanations on all exported functions in `packages/stellar/src/index.ts`, `apps/web/src/lib/stellar.ts`, and `apps/web/src/lib/crypto.ts` (#103)
- Vitest unit tests for `buildTransaction`, `anchorReading` (build_anchor_tx), `mintCertificates` (build_mint_tx), and `retireCertificate` (build_retire_tx) with mocked Stellar RPC (#118)

---

## [1.0.0] — 2026-04-21

### Added
- End-to-end cryptographic proof pipeline: Ed25519 meter signing → on-chain anchor → certificate minting → retirement
- Three Soroban smart contracts: `energy_token` (SEP-41), `audit_registry`, `community_governance`
- `packages/stellar` shared utilities: `buildTransaction`, `kwhToStroops`, `stroopsToKwh`, `addressToScVal`, `amountToScVal`, `bytesToScVal`
- Next.js 15 web app with dashboard, public verifier (`/verify`), and API routes
- `POST /api/readings` endpoint: verifies Ed25519 signature, anchors hash, mints certificates
- tracer-sim integration for automatic diagnosis of failed Soroban transactions
- Supabase backend for off-chain reading storage and meter registry
- Docker Compose stack (Next.js + Supabase + Redis) for local development
- Meter simulation scripts (`scripts/gen-meter-key.mjs`, `scripts/send-reading.mjs`)
- CI workflow with GitHub Actions (lint, type-check, build, contract tests)
- Gitleaks secret-scanning workflow
- semantic-release configuration for automated versioning and changelog generation
- Architecture Decision Records (`docs/adr/`)
- API reference (`docs/API.md`), deployment guide (`docs/DEPLOYMENT.md`), onboarding guide (`docs/ONBOARDING.md`)

[Unreleased]: https://github.com/AnnabelJoe/solarproof/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AnnabelJoe/solarproof/releases/tag/v1.0.0
