-- Migration 005: audit_log table
-- Append-only log of operator actions for compliance.

create table audit_log (
  id          uuid        primary key default gen_random_uuid(),
  operator_id text        not null,
  action      text        not null,
  resource_id text,
  ip_address  inet,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Append-only: deny UPDATE and DELETE for all roles
create rule audit_log_no_update as on update to audit_log do instead nothing;
create rule audit_log_no_delete as on delete to audit_log do instead nothing;

-- Index for operator queries and time-range exports
create index audit_log_operator_idx on audit_log (operator_id, created_at desc);
create index audit_log_action_idx   on audit_log (action, created_at desc);
