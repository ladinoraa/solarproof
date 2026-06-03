# Operational Runbook

This runbook covers the operational procedures required to keep SolarProof running safely and recover from common incidents.

## Key Rotation

### When
- Developer or operator key material is rotated regularly.
- A key is suspected compromised.
- A private key is lost or exposed.

### Steps
1. Identify the key to rotate.
2. Generate a new key pair with the same curve and format used by the service.
   - For Stellar signing keys, use a secure key generation process.
3. Update the key material in the appropriate secrets store.
   - For cloud deployment: update secrets in the secret manager or CI environment.
   - For local deployment: update `.env` or environment variables.
4. Restart the affected services.
   - For `apps/web`, restart the web server so it loads the new environment variables.
5. Verify the service starts correctly.
   - Confirm the service logs show successful startup.
   - Test signing or verification flows that depend on the rotated key.
6. Revoke or archive the old key.
   - Remove the old key from active secret storage.
   - Mark the old key as retired in audit logs.

### Notes
- Do not rotate on a production-critical path without a maintenance window.
- Test rotation in staging first whenever possible.

## Contract Pause

### When
- There is a smart contract vulnerability.
- There is a need to temporarily stop on-chain operations.

### Steps
1. Confirm the contract has a pause function or governance-controlled pause mechanism.
2. Identify the contract address and the authorized pause signer.
3. Execute the pause transaction using the authorized key.
   - Use the on-chain governance flow from the contract documentation.
4. Confirm the transaction was accepted on Stellar.
   - Verify the pause event or contract state through the block explorer or smart contract logs.
5. Communicate the pause to stakeholders.
   - Notify governance members and ops teams.

### Resume Steps
1. Verify the vulnerability or incident is resolved.
2. Execute the unpause transaction following the same governance path.
3. Confirm the contract is active again.
4. Test the contract functionality with a non-production transaction or simulation.

## Database Restore

### When
- The production database is corrupted.
- Data is accidentally deleted.
- Recovery from failed migration is required.

### Steps
1. Verify the current database state and collect diagnostics.
2. Identify the correct backup to restore.
   - Use the latest known-good SQL backup or dump.
3. If possible, restore into a staging environment first.
   - Validate the restore process on a non-production clone.
4. Stop write traffic to the production database.
   - Disable application access or put the service into maintenance mode.
5. Restore the backup.
   - Use `psql` or the database provider restore process.
   - For Supabase-managed Postgres, use the provider restore tools.
6. Reapply any safe migrations if needed.
   - Confirm the restored schema matches expected application schema.
7. Validate the restored data.
   - Run health checks and query key tables.
   - Confirm the application can read data successfully.
8. Bring the service back online.
   - Monitor traffic and error rates closely.

### Notes
- Keep a documented backup retention policy.
- Tag backups with timestamps and purpose.

## Incident Response

### Initial Triage
1. Detect the incident.
   - Use monitoring alerts, error reports, or user feedback.
2. Record the incident.
   - Create an incident ticket with severity, impact, and scope.
3. Identify the systems affected.
   - Web app, API routes, database, smart contracts, or infrastructure.
4. Assign an on-call responder.

### Containment
1. Stop the incident from worsening.
   - Disable the affected feature.
   - Apply temporary mitigations.
2. Preserve evidence.
   - Capture logs, snapshots, and database exports.
3. Communicate status.
   - Notify stakeholders and maintainers.

### Resolution
1. Investigate root cause.
   - Review logs, code, recent deployments, and configuration changes.
2. Apply the fix.
   - Patch code, rollback deployment, or restore state.
3. Validate recovery.
   - Run smoke tests and confirm normal operation.
4. Document the incident.
   - Record what happened, why, and how it was fixed.

### Postmortem
1. Conduct a post-incident review.
2. Identify improvements.
   - Update runbook procedures.
   - Add monitoring or alerting gaps.
3. Share lessons learned with the team.
