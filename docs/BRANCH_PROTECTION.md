# Branch Protection

Branch protection rules for `main` and `develop` are applied automatically by the
[`branch-protection` workflow](.github/workflows/branch-protection.yml).

## Rules (both branches)

| Rule | Value |
|---|---|
| Required approvals | 1 |
| Dismiss stale reviews on new commits | ✅ |
| Require CI to pass before merge | ✅ (see required checks below) |
| Allow force pushes | ❌ |
| Allow branch deletion | ❌ |
| Require conversation resolution | ✅ |

`main` additionally enforces rules for admins (`enforce_admins: true`).

## Required CI checks

- `Web (lint + type-check + test + build)` — from `.github/workflows/ci.yml`
- `Contracts (fmt + clippy + test)` — from `.github/workflows/ci.yml`

## Setup

The workflow requires a **Personal Access Token** with `administration:write` scope:

1. Create a PAT: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
   - Repository: `AnnabelJoe/solarproof`
   - Permissions: `Administration` → Read and write
2. Add it as a repository secret: Settings → Secrets → `BRANCH_PROTECTION_TOKEN`
3. The workflow runs automatically on the next push to `main`, or trigger it manually via
   Actions → *Apply Branch Protection* → *Run workflow*.
