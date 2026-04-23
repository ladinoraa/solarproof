# Contributing to SolarProof

Thanks for contributing! PRs target `develop`. All CI must pass before merge.

---

## Getting Started

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

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>-<issue>` | `feat/batch-anchor-42` |
| Bug fix | `fix/<short-description>-<issue>` | `fix/signature-validation-17` |
| Docs | `docs/<short-description>` | `docs/contract-interfaces` |
| Chore / CI | `chore/<short-description>` | `chore/turbo-remote-cache` |
| Release | `release/v<semver>` | `release/v1.2.0` |

---

## Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: BREAKING CHANGE: ..., Closes #<issue>]
```

**Types:** `feat` · `fix` · `docs` · `chore` · `refactor` · `test` · `ci` · `perf`

**Scopes:** `api` · `contracts` · `web` · `stellar` · `ci` · `docs`

```
feat(contracts): add batch anchor support
fix(api): validate Ed25519 signature before DB write
docs(contracts): document energy_token interface
chore(ci): configure Turborepo remote caching
feat(contracts)!: rename anchor() parameter kwh → kwh_stroops

BREAKING CHANGE: kwh parameter renamed to kwh_stroops (units: kwh * 10^7)
Closes #42
```

---

## Development Commands

```bash
pnpm dev                              # Next.js dev server
pnpm lint                             # ESLint + tsc
pnpm build                            # Full monorepo build
cd apps/contracts && cargo test       # Rust contract tests
cd apps/contracts && stellar contract build  # Build WASM
```

---

## PR Checklist

Before opening a PR, confirm:

- [ ] Branch is based on `develop` (not `main`)
- [ ] Branch name follows the convention above
- [ ] All commits follow Conventional Commits format
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm build` succeeds
- [ ] Relevant tests added or updated
- [ ] `cargo test` passes for any contract changes
- [ ] Docs updated if public interfaces changed
- [ ] PR description references the issue (`Closes #<n>`)
- [ ] No secrets or `.env` files committed

---

## Code Review Expectations

**For authors:**
- Keep PRs focused — one concern per PR
- Respond to review comments within 2 business days
- Resolve conversations before requesting re-review
- Don't force-push after review has started (use new commits)

**For reviewers:**
- Review within 2 business days of assignment
- Distinguish blocking issues from suggestions (prefix suggestions with `nit:`)
- Approve only when all blocking issues are resolved
- At least 1 approval required before merge

**Merge strategy:** Squash and merge into `develop`. Merge commits into `main` for releases only.

---

## Smart Contract Changes

Contract changes require extra care:

- All public function signatures are part of the on-chain ABI — breaking changes need a `BREAKING CHANGE:` footer
- Update `docs/contracts/<name>.md` for any interface changes
- Run `cargo test` and include test output in the PR description
- Tag breaking changes with the `breaking-change` label

---

## Reporting Issues

Use the [issue templates](../../issues/new/choose). For security vulnerabilities, see [SECURITY.md](SECURITY.md).
