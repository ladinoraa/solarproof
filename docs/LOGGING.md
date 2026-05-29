# Logging

SolarProof ships structured logs to [Better Stack (Logtail)](https://betterstack.com/logs) via `@logtail/next`.

## Setup

Set the source token in your environment:

```
LOGTAIL_SOURCE_TOKEN=<your-token>
```

Get a token from the [Better Stack dashboard](https://logs.betterstack.com) → Sources → Create source → Node.js.

## Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Development diagnostics (suppressed in production by default) |
| `info` | Normal operations: readings received, tokens minted, anchors recorded |
| `warn` | Recoverable issues: retries, degraded service |
| `error` | Failures: mint errors, signature verification failures, contract errors |

## Usage

```ts
import { log } from "@/lib/logger";

log("info", "Reading anchored", { reading_id: id, kwh });
log("error", "Mint failed", { reading_id: id, reason: err.message });
```

## Sensitive Data Exclusion

The logger automatically redacts any metadata field whose name matches `/secret|key|signature|token/i`. The value is replaced with `[REDACTED]` before the log is shipped.

Redacted fields include (but are not limited to): `secret_key`, `signature_hex`, `pubkey_hex`, `service_role_key`, `source_token`.

Never log raw private keys or signatures. Use `reading_id` or `tx_hash` as correlation identifiers instead.

## Retention Policy

Configure retention in the Better Stack dashboard under **Sources → Retention**:

| Level | Retention |
|-------|-----------|
| `info`, `debug`, `warn` | 30 days |
| `error` | 90 days |

To enforce this, create two separate Better Stack sources (one for errors, one for everything else) and route logs accordingly, or use Better Stack's built-in retention tiers.

## Alerts

Set up alerts in Better Stack under **Alerts → Create alert**:

| Alert | Condition | Channel |
|-------|-----------|---------|
| Error rate spike | `level = error` count > 10 in 5 min | Email / PagerDuty |
| Mint failure | `message contains "Mint failed"` any occurrence | Slack |
| Signature failure | `message contains "signature"` count > 5 in 1 min | Email |

## Local Development

Without `LOGTAIL_SOURCE_TOKEN` set, `@logtail/next` falls back to `console` output. No configuration needed for local development.
