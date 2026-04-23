# SolarProof — Threat Model

## System overview

```
Smart Meter → SolarProof API (Next.js) → Stellar/Soroban contracts
                     ↕
                 Supabase (off-chain store)
```

## Trust boundaries

| Boundary | Trust level |
|---|---|
| Smart meter device | Trusted if Ed25519 keypair is uncompromised |
| SolarProof API | Trusted server; holds `MINTER_SECRET_KEY` |
| Stellar network | Trusted (Byzantine fault-tolerant consensus) |
| Supabase | Trusted for availability; not trusted for integrity (hash is the source of truth) |
| Public verifier callers | Untrusted |

---

## Threat catalogue

### T1 — Forged meter reading
**Asset:** Energy certificates  
**Attacker:** External actor without meter private key  
**Attack:** Submit a POST `/api/readings` with a fabricated `signature_hex`  
**Mitigation:** API verifies Ed25519 signature against the meter's registered `pubkey_hex` before anchoring or minting. Invalid signatures return HTTP 401.  
**Residual risk:** Low — requires breaking Ed25519 or compromising the meter keypair.

### T2 — Meter key compromise
**Asset:** Energy certificates  
**Attacker:** Physical attacker with access to meter hardware  
**Attack:** Extract the meter's Ed25519 private key and mint unlimited certificates  
**Mitigation (current):** Compromised meter can be deactivated in Supabase (`active = false`); API rejects readings from inactive meters.  
**Mitigation (future):** Hardware HSM / TPM integration (Level 2 roadmap).  
**Residual risk:** Medium — key extraction from software-only meters is feasible.

### T3 — Minter key compromise
**Asset:** Energy certificates  
**Attacker:** Attacker who obtains `MINTER_SECRET_KEY`  
**Attack:** Call `energy_token.mint()` directly to mint arbitrary certificates  
**Mitigation:** Key stored in GitHub Actions secrets / Vercel env vars (never committed). Secret scanning workflow (gitleaks) blocks accidental exposure.  
**Residual risk:** Medium — if the key leaks, `set_minter()` (admin-only) can rotate it.

### T4 — Replay attack
**Asset:** Ledger integrity  
**Attacker:** Network observer  
**Attack:** Re-submit a previously valid signed reading to anchor it twice  
**Mitigation:** `audit_registry.anchor()` panics with `"reading already anchored"` on duplicate hashes. The hash includes `meter_id`, `kwh_stroops`, and `timestamp`, making each reading unique.  
**Residual risk:** Low.

### T5 — Unauthorized minting
**Asset:** Energy certificates  
**Attacker:** Any Stellar account  
**Attack:** Call `energy_token.mint()` directly without being the minter  
**Mitigation:** `mint()` calls `minter.require_auth()` — Soroban rejects the transaction if the minter's signature is absent.  
**Residual risk:** Low.

### T6 — Governance manipulation
**Asset:** Cooperative decisions  
**Attacker:** Sybil attacker with many addresses  
**Attack:** Create many addresses and vote multiple times on a proposal  
**Mitigation (current):** Each address can vote once per proposal (enforced on-chain). Quorum is percentage-based.  
**Mitigation (future):** Token-weighted voting (requires holding SPEC tokens).  
**Residual risk:** Medium — 1-address-1-vote is Sybil-vulnerable without token gating.

### T7 — Supabase data tampering
**Asset:** Off-chain reading payload  
**Attacker:** Attacker with Supabase service role key  
**Attack:** Modify `readings` table records to alter kwh or meter_id  
**Mitigation:** The on-chain `reading_hash` is the canonical source of truth. Any tampering is detectable by recomputing `sha256(meter_id || kwh_stroops_le || timestamp_le)` and comparing to the anchored hash.  
**Residual risk:** Low for integrity; Medium for availability (data could be deleted).

### T8 — Persistent storage expiry
**Asset:** Anchored readings, token balances  
**Attacker:** Passive (time / ledger advancement)  
**Attack:** Persistent storage entries expire if TTL is not extended  
**Mitigation:** Not yet implemented — TTL bump logic needed before mainnet.  
**Residual risk:** High on mainnet without TTL management.

### T9 — Integer overflow in governance quorum
**Asset:** Proposal outcome integrity  
**Attacker:** Proposer who engineers a specific vote count  
**Attack:** Craft `yes_votes` and `total_votes` such that `yes_votes * 100` overflows `u32`  
**Mitigation:** Soroban SDK compiles with `overflow-checks = true` in release profile — overflow panics rather than wrapping.  
**Residual risk:** Low.

---

## Out-of-scope threats

- Stellar network-level attacks (validator collusion, eclipse attacks)
- Vercel / hosting infrastructure compromise
- Browser-side attacks on the public verifier UI
