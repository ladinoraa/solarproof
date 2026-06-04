-- Migration: Cooperative accounts and governance tables
-- Closes #351

-- 1. Add account_type to cooperatives
alter table cooperatives
  add column if not exists account_type text not null default 'individual'
  check (account_type in ('individual', 'cooperative'));

-- 2. Create proposals table
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references cooperatives(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'active' check (status in ('active', 'passed', 'rejected')),
  action text,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 3. Create votes table
create table if not exists votes (
  proposal_id uuid not null references proposals(id) on delete cascade,
  voter_id uuid not null,
  choice text not null check (choice in ('for', 'against', 'abstain')),
  created_at timestamptz not null default now(),
  primary key (proposal_id, voter_id)
);

-- 4. Enable RLS
alter table proposals enable row level security;
alter table votes enable row level security;

-- 5. RLS Policies for proposals
create policy "members_select_own_proposals" on proposals
  for select using (cooperative_id = auth.cooperative_id());

create policy "members_insert_own_proposals" on proposals
  for insert with check (cooperative_id = auth.cooperative_id());

create policy "admin_all_proposals" on proposals
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 6. RLS Policies for votes
create policy "members_select_own_votes" on votes
  for select using (
    exists (
      select 1 from proposals p
      where p.id = votes.proposal_id
        and p.cooperative_id = auth.cooperative_id()
    )
  );

create policy "members_insert_own_votes" on votes
  for insert with check (
    voter_id = (auth.jwt() ->> 'sub')::uuid and
    exists (
      select 1 from proposals p
      where p.id = votes.proposal_id
        and p.cooperative_id = auth.cooperative_id()
    )
  );

create policy "admin_all_votes" on votes
  for all using (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 7. Indexes for performance
create index if not exists idx_proposals_cooperative_id on proposals(cooperative_id);
create index if not exists idx_votes_proposal_id on votes(proposal_id);

-- 8. Helper function for cooperative stats
create or replace function sum_cooperative_kwh(target_cooperative_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(r.kwh), 0)
  from readings r
  join meters m on m.id = r.meter_id
  where m.cooperative_id = target_cooperative_id
    and r.anchored = true;
$$;
