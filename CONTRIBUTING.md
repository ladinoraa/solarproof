# Contributing to SolarProof

1. Browse [open issues](../../issues) — look for `good first issue`
2. Comment to claim before starting
3. Fork and branch from `develop`

```bash
git clone https://github.com/AnnabelJoe/solarproof.git
cd solarproof
git checkout develop
git checkout -b feat/your-feature
pnpm install
```

## Commands

```bash
pnpm dev          # Next.js dev server
pnpm lint         # ESLint + tsc
cd apps/contracts && cargo test   # Rust tests
```

## Commit convention

```
feat(registry): add batch anchor support
fix(api): validate signature before DB write
docs: update verifier guide
```

## PRs target `develop`. All CI must pass.
