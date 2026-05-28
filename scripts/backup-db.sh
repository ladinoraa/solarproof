#!/usr/bin/env bash
# backup-db.sh — dump Supabase Postgres to S3 with 30-day retention
# Required env vars: DATABASE_URL, S3_BUCKET, AWS_ACCESS_KEY_ID,
#                    AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
# Optional:          SLACK_BACKUP_WEBHOOK (for failure alerts)
set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="solarproof-backup-${TIMESTAMP}.dump"
TMPFILE="/tmp/${FILENAME}"

alert() {
  echo "ERROR: $1" >&2
  if [[ -n "${SLACK_BACKUP_WEBHOOK:-}" ]]; then
    curl -s -X POST "$SLACK_BACKUP_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🚨 *SolarProof DB backup failed*\n${1}\"}"
  fi
  exit 1
}

# Dump
pg_dump --format=custom --no-acl --no-owner "$DATABASE_URL" -f "$TMPFILE" \
  || alert "pg_dump failed"

# Upload
aws s3 cp "$TMPFILE" "s3://${S3_BUCKET}/backups/${FILENAME}" \
  || alert "S3 upload failed"

# Enforce 30-day retention
CUTOFF=$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v-30d +%Y-%m-%dT%H:%M:%SZ)   # GNU / BSD fallback

aws s3api list-objects-v2 \
  --bucket "$S3_BUCKET" \
  --prefix "backups/" \
  --query "Contents[?LastModified<='${CUTOFF}'].Key" \
  --output text \
| tr '\t' '\n' \
| grep -v '^$' \
| while read -r key; do
    aws s3 rm "s3://${S3_BUCKET}/${key}"
    echo "Deleted old backup: ${key}"
  done

rm -f "$TMPFILE"
echo "Backup complete: s3://${S3_BUCKET}/backups/${FILENAME}"
