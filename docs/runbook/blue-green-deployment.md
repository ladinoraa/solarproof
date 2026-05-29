# Blue-Green Deployment Runbook

**Last updated:** 2026-05-29  
**Relates to:** [Issue #301](https://github.com/AnnabelJoe/solarproof/issues/301)

## Overview

SolarProof uses Vercel's built-in preview/production promotion model to implement a blue-green deployment strategy. The **blue** environment is the current live production deployment; the **green** environment is the new version being validated before traffic is shifted.

```
Internet → Vercel Edge → [blue] production (current)
                       → [green] preview URL (new version, under validation)
```

Traffic is only shifted to green after health checks pass. Rollback is instant — re-promote the previous deployment.

---

## Prerequisites

- Vercel CLI: `npm i -g vercel@latest`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` set in CI secrets
- `/api/health` endpoint returning `200 OK` with `{ "status": "ok" }`

---

## Deployment Steps

### 1. Deploy to preview (green)

```bash
vercel deploy --token $VERCEL_TOKEN
# Outputs a preview URL, e.g. https://solarproof-abc123.vercel.app
```

### 2. Run health checks against green

```bash
PREVIEW_URL="https://solarproof-abc123.vercel.app"

for i in $(seq 1 5); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL/api/health")
  [ "$STATUS" = "200" ] && echo "Health check $i passed" && continue
  echo "Health check $i FAILED (HTTP $STATUS)" && exit 1
done
```

### 3. Promote green to production (shift traffic)

Only run after all health checks pass:

```bash
vercel promote $PREVIEW_URL --token $VERCEL_TOKEN
```

Vercel atomically shifts 100% of production traffic to the new deployment.

---

## Rollback

Instant rollback to the previous production deployment:

```bash
# List recent deployments
vercel ls --token $VERCEL_TOKEN

# Promote the previous stable deployment
vercel promote <previous-deployment-url> --token $VERCEL_TOKEN
```

Rollback completes in under 30 seconds with no downtime.

---

## CI Integration

The `.github/workflows/deploy-staging.yml` workflow automates this process:

1. Build and deploy to Vercel preview
2. Run health checks (5 retries, 10s apart)
3. On success: promote to production
4. On failure: leave production on blue, alert via GitHub Actions summary

---

## Health Check Endpoint

`GET /api/health` must return:

```json
{ "status": "ok", "version": "<git-sha>" }
```

HTTP 200 on healthy, HTTP 503 on degraded.

---

## Intervals and Retries

| Check | Interval | Retries | Timeout |
|---|---|---|---|
| Preview health | 10s | 5 | 5s per request |
| Post-promote verification | 30s | 3 | 10s per request |
