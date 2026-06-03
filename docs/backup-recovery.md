# Supabase Backup and Recovery

## Purpose

This document defines the automated backup and restore procedure for SolarProof's Supabase database.
It ensures data recovery support for production and staging, with a minimum retention period of 30 days.

## Backup policy

- Daily automated backups should be configured inside Supabase.
- Backup retention must be at least 30 days.
- Backups are stored in Supabase-managed storage and optionally exported to a secondary cloud bucket for long-term retention.
- Recovery Time Objective (RTO): 2 hours
- Recovery Point Objective (RPO): 24 hours

## Daily backup configuration

1. Open the Supabase dashboard for the project.
2. Go to **Settings > Backups**.
3. Enable daily backups.
4. Confirm retention is at least 30 days.
5. Enable automated export if available.

## Monthly restore verification

A restore should be tested monthly in a staging environment:

1. Select a backup from the previous 30 days.
2. Restore it into a staging Supabase project.
3. Run the application smoke tests against staging.
4. Confirm the restored database contains expected tables and recent sample rows.
5. Record the restore result and any remediation steps.

## Restore procedure

### Restore into staging

1. Open the Supabase dashboard.
2. Navigate to **Backups**.
3. Choose the desired backup snapshot.
4. Select the staging project as the restore target.
5. Confirm and wait for restore completion.

### Verify the restore

After restore completion:

- Connect to staging with the restored credentials.
- Confirm the `readings`, `cooperatives`, and `certificates` tables exist.
- Confirm sample rows are present for fresh data.
- Execute the smoke test command below.

## Smoke test for restored staging

```bash
pnpm exec node scripts/smoke-test.mjs
```

## Roles and ownership

- Primary owner: platform operations
- Secondary owner: engineering team
- Documentation owner: repository maintainers

## Notes

- If Supabase adds native point-in-time recovery, update this document to reflect the new process.
- If backup export fails, raise an incident and verify the backup job in the Supabase dashboard.
