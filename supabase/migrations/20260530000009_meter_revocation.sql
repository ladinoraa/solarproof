-- Migration 009: meter key revocation
-- Adds fields to track revocation of compromised meter keys.

ALTER TABLE meters 
ADD COLUMN revoked_at timestamptz,
ADD COLUMN revocation_reason text;

-- Index for performance when checking active meters
CREATE INDEX idx_meters_active_revoked ON meters (id) WHERE active = true AND revoked_at IS NULL;

-- Update existing audit_action enum if it exists (Supabase/Postgres)
-- Note: In Supabase, we often use text for action, but let's check if it's an enum.
-- Based on apps/web/src/lib/audit.ts, it seems to be handled in application logic,
-- but the database table might have a check constraint or just text.
