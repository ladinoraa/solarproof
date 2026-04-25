-- Migration 005: idempotency keys for meter reading submissions
-- Prevents duplicate anchoring when clients retry on network failure.
-- Nonces expire after 24 hours (enforced by the application layer).

create table idempotency_keys (
  nonce       text        primary key,
  reading_id  uuid        not null references readings(id) on delete cascade,
  response    jsonb       not null,
  created_at  timestamptz not null default now()
);

-- Allow the application to efficiently purge expired keys
create index on idempotency_keys(created_at);
