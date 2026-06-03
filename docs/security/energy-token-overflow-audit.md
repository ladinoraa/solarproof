# energy_token Integer Overflow Audit

**Issue:** #277  
**Date:** 2026-05-29  
**Severity:** Critical  
**Status:** Resolved

## Summary

The `energy_token` contract performed unchecked arithmetic on `i128` kWh values. In Rust, debug builds panic on overflow but release/Wasm builds wrap silently, which could allow minting more tokens than physically generated.

## Findings

| Location | Operation | Risk | Fix |
|---|---|---|---|
| `mint` — balance update | `bal + amount` | Overflow → inflated balance | `checked_add` |
| `mint` — total_minted update | `total + amount` | Overflow → wrong supply | `checked_add` |
| `burn` — balance update | `bal - amount` | Underflow (guarded by assert, but belt-and-suspenders) | `checked_sub` |
| `burn` — total_burned update | `total + amount` | Overflow | `checked_add` |
| `transfer` — sender balance | `fb - amount` | Underflow (guarded by assert) | `checked_sub` |
| `transfer` — receiver balance | `tb + amount` | Overflow | `checked_add` |

## Fix Applied

All arithmetic replaced with `checked_add` / `checked_sub`. Each panics with a descriptive message on overflow/underflow, making the failure explicit and auditable on-chain.

## Tests Added

Boundary tests covering:
- `amount = 0` → rejected
- `amount = -1` → rejected  
- `amount = 1` → accepted (minimum valid)
- `balance = i128::MAX - 1` → accepted
- Overflow: balance at `i128::MAX - 1`, mint 2 → panics with `"balance overflow"`
