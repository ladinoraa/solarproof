# Log Aggregation

SolarProof ships structured JSON logs to **Better Stack (Logtail)** from all Next.js API routes.

## Setup

1. Create a **Source** in [Better Stack Logs](https://logs.betterstack.com) → choose *HTTP source*.
2. Copy the **Source token** and add it to your environment:
   - Vercel: `Settings → Environment Variables → LOGTAIL_SOURCE_TOKEN`
   - Local: add to `.env.local`
3. Retention is configured per-team in Better Stack → **30 days** is the default for the free tier; upgrade if needed.

## Log format

Every log line is a JSON object:

```json
{
  "level": "info",
  "event": "reading.anchored",
  "timestamp": "2026-04-24T13:00:00.000Z",
  "txHash": "abc123",
  "kwh": 12.5
}
```

## Usage in code

```ts
import { logger } from '@/lib/logger'

logger.info('reading.anchored', { txHash, kwh })
logger.error('mint.failed', { error: err.message, readingId })
```

## Alerts

Configure in Better Stack → **Alerts**:

| Alert | Condition | Channel |
|---|---|---|
| Error spike | `level = error` count > 10 in 5 min | Email / PagerDuty |
| High error rate | `level = error` / total > 5 % over 15 min | Slack |

Logs are also captured by Vercel function logs (stdout) and Sentry (errors via `@sentry/nextjs`).
