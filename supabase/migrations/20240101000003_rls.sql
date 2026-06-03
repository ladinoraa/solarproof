-- Migration 003: Row Level Security for multi-operator isolation
--
-- Identity model:
--   Each authenticated user carries a JWT with:
--     app_metadata.cooperative_id  (uuid)  — the operator's cooperative
--     app_metadata.role            (text)  — 'admin' for super-users
--
-- Helper to extract the cooperative_id claim from the current JWT.
create or replace function auth.cooperative_id() returns uuid
  language sql stable
  as $$
    select (auth.jwt() -> 'app_metadata' ->> 'cooperative_id')::uuid
  $$;

-- Helper: true when the caller is an admin.
create or replace function auth.is_admin() returns boolean
  language sql stable
  as $$
    select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  $$;

-- ── cooperatives ────────────────────────────────────────────────────────────
alter table cooperatives enable row level security;

create policy "operators: own cooperative"
  on cooperatives for all
  using (id = auth.cooperative_id() or auth.is_admin());

-- ── meters ───────────────────────────────────────────────────────────────────
alter table meters enable row level security;

create policy "operators: own meters"
  on meters for all
  using (cooperative_id = auth.cooperative_id() or auth.is_admin());

-- ── readings ─────────────────────────────────────────────────────────────────
-- readings have no cooperative_id; scope via the parent meter.
alter table readings enable row level security;

create policy "operators: own readings"
  on readings for all
  using (
    auth.is_admin()
    or exists (
      select 1 from meters m
      where m.id = readings.meter_id
        and m.cooperative_id = auth.cooperative_id()
    )
  );

-- ── certificates ─────────────────────────────────────────────────────────────
alter table certificates enable row level security;

create policy "operators: own certificates"
  on certificates for all
  using (cooperative_id = auth.cooperative_id() or auth.is_admin());
