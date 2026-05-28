-- Migration 006: webhook endpoints and delivery logs

create table webhook_endpoints (
  id           uuid        primary key default gen_random_uuid(),
  cooperative_id uuid      not null references cooperatives(id) on delete cascade,
  url          text        not null,
  secret       text        not null,  -- used for HMAC-SHA256 signing
  events       text[]      not null,  -- e.g. '{anchor,mint,retire}'
  active       boolean     not null default true,
  created_at   timestamptz not null default now()
);

create index on webhook_endpoints(cooperative_id);

create table webhook_logs (
  id           uuid        primary key default gen_random_uuid(),
  endpoint_id  uuid        not null references webhook_endpoints(id) on delete cascade,
  event        text        not null,
  payload      jsonb       not null,
  status       text        not null,  -- 'delivered' | 'failed'
  attempts     int         not null default 0,
  response_status int,
  created_at   timestamptz not null default now()
);

create index on webhook_logs(endpoint_id);
-- Purge logs older than 30 days via a scheduled job or pg_cron
create index on webhook_logs(created_at);
