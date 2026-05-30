# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch | ✅ |
| Older releases | ❌ |

We only provide security fixes for the current `main` branch.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities by emailing:

**security@solarproof.dev**

Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected component(s) (API, smart contracts, frontend, scripts)
- Any suggested mitigations

We will acknowledge your report within **48 hours** and aim to provide a resolution timeline within **7 days**.

---

## Disclosure Process

1. You report the vulnerability privately to `security@solarproof.dev`
2. We acknowledge receipt within **48 hours**
3. We investigate and develop a fix (target: within 14 days for critical issues)
4. We coordinate a release date with you before public disclosure
5. We publish a security advisory and credit the reporter (unless you prefer to remain anonymous)

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure) and ask that you do the same — please allow us reasonable time to patch before any public disclosure.

---

## Scope

The following are **in scope**:

- `POST /api/readings` — Ed25519 signature verification bypass
- `POST /api/certificates/[id]/retire` — unauthorized retirement
- `GET /api/verify` — data leakage or manipulation
- Soroban smart contracts (`energy_token`, `audit_registry`, `community_governance`)
- Authentication and authorization logic
- Supabase RLS policy bypasses

The following are **out of scope**:

- Stellar testnet infrastructure (report to Stellar Foundation)
- Third-party dependencies (report upstream; we will patch promptly when fixes are available)
- Social engineering or phishing attacks
- Denial-of-service attacks without a demonstrated security impact

---

## Bug Bounty

SolarProof does not currently operate a paid bug bounty program. We do publicly credit all responsible disclosures in our security advisories.

---

## PGP Key

A PGP key for encrypted communication will be published here once the project reaches production. In the meantime, please use the email above.
