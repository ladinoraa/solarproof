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
- feat(contracts): implement certificate retirement in energy_token (4a22103)
- feat(contracts): optimize Soroban storage for audit-registry (f9055f7)
- STRIDE-based threat model (`docs/THREAT_MODEL.md`) covering 13 attack vectors across all 6 STRIDE categories (#110)
- TSDoc comments and inline explanations on all exported functions in `packages/stellar/src/index.ts`, `apps/web/src/lib/stellar.ts`, and `apps/web/src/lib/crypto.ts` (#103)
- Vitest unit tests for `buildTransaction`, `anchorReading` (build_anchor_tx), `mintCertificates` (build_mint_tx), and `retireCertificate` (build_retire_tx) with mocked Stellar RPC (#118)

## [1.9.0] - 2026-05-29
### Added
- configure log aggregation and retention ([#299](https://github.com/AnnabelJoe/solarproof/issues/299))

## [1.8.2] - 2026-05-29
### Fixed
- use checked arithmetic in energy_token to prevent overflow ([#277](https://github.com/AnnabelJoe/solarproof/issues/277))

## [1.8.1] - 2026-05-29
### Fixed
- add replay attack protection to audit_registry contract ([#280](https://github.com/AnnabelJoe/solarproof/issues/280))

## [1.8.0] - 2026-05-29
### Added
- automate Stellar Testnet faucet funding in CI ([#303](https://github.com/AnnabelJoe/solarproof/issues/303))
- **adr:** add ADR-005 monorepo structure and ADR-006 certificate retirement model ([#311](https://github.com/AnnabelJoe/solarproof/issues/311))

## [1.7.1] - 2026-05-29
### Fixed
- implement CSRF protection for state-changing API endpoints ([#335](https://github.com/AnnabelJoe/solarproof/issues/335))

## [1.7.0] - 2026-05-28
### Added
- **#145:** add Stellar explorer deep links for all on-chain transactions ([#145](https://github.com/AnnabelJoe/solarproof/issues/145))
- add JSDoc to all public API functions ([#316](https://github.com/AnnabelJoe/solarproof/issues/316))
- complete OpenAPI 3.0 spec for all API endpoints ([#307](https://github.com/AnnabelJoe/solarproof/issues/307))
- document public verifier API for third-party integrations ([#313](https://github.com/AnnabelJoe/solarproof/issues/313))

## [1.6.0] - 2026-05-28
### Added
- implement SEP-41 approve/allowance/transfer_from ([#286](https://github.com/AnnabelJoe/solarproof/issues/286))
- document Ed25519 meter signing protocol and key lifecycle ([#309](https://github.com/AnnabelJoe/solarproof/issues/309))

## [1.5.0] - 2026-05-28
### Added
- **api:** add Idempotency-Key header support to readings API ([#267](https://github.com/AnnabelJoe/solarproof/issues/267))

## [1.4.0] - 2026-05-28
### Added
- **observability:** add OpenTelemetry APM instrumentation ([#291](https://github.com/AnnabelJoe/solarproof/issues/291))
- enhance developer onboarding guide ([#308](https://github.com/AnnabelJoe/solarproof/issues/308))

## [1.3.0] - 2026-05-28
### Added
- add /api/health and /api/ready endpoints ([#275](https://github.com/AnnabelJoe/solarproof/issues/275))
- document pnpm --frozen-lockfile requirement ([#302](https://github.com/AnnabelJoe/solarproof/issues/302))

## [1.2.0] - 2026-05-28
### Added
- add governance voting UI ([#265](https://github.com/AnnabelJoe/solarproof/issues/265))

## [1.1.0] - 2026-05-28
### Added
- responsive dashboard, certificate detail page, toast notifications, and accessibility improvements (704c0a5)

## [1.0.0] - 2026-04-21
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

[Unreleased]: https://github.com/AnnabelJoe/solarproof/compare/v1.9.0...HEAD
[1.9.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.8.2...v1.9.0
[1.8.2]: https://github.com/AnnabelJoe/solarproof/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/AnnabelJoe/solarproof/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.7.1...v1.8.0
[1.7.1]: https://github.com/AnnabelJoe/solarproof/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/AnnabelJoe/solarproof/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AnnabelJoe/solarproof/releases/tag/v1.0.0
