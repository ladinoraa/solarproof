-- Migration 005: async job queue for Stellar transactions
create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,                          -- e.g. 'anchor_and_mint'
  payload jsonb not null default '{}',
  status text not null default 'pending'       -- pending | running | done | failed
    check (status in ('pending', 'running', 'done', 'failed')),
  attempts int not null default 0,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_status_created_at on jobs (status, created_at);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_updated_at
  before update on jobs
  for each row execute procedure set_updated_at();
