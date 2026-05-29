-- Migration 007: operator_sessions for JWT refresh token rotation
-- Tracks active refresh tokens so they can be invalidated on logout.

create table operator_sessions (
  id            uuid        primary key default gen_random_uuid(),
  operator_id   uuid        not null,   -- references auth.users(id) via Supabase Auth
  refresh_token text        not null unique,
  expires_at    timestamptz not null,
  revoked       boolean     not null default false,
  created_at    timestamptz not null default now()
);

create index operator_sessions_operator_id_idx on operator_sessions (operator_id);
create index operator_sessions_refresh_token_idx on operator_sessions (refresh_token);
-- Purge expired/revoked sessions via pg_cron or a scheduled job
create index operator_sessions_expires_at_idx on operator_sessions (expires_at) where not revoked;
