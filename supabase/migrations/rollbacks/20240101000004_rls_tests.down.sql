-- Rollback 004: drop RLS test helpers (pgTAP tests are run-and-discard; nothing to undo)
-- The pgTAP extension itself is left in place as other tests may use it.
select 1; -- no-op
