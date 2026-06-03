-- Rollback 003: drop RLS policies and helper functions
drop policy if exists "operators: own cooperative" on cooperatives;
drop policy if exists "operators: own meters" on meters;
drop policy if exists "operators: own readings" on readings;
drop policy if exists "operators: own certificates" on certificates;

alter table cooperatives disable row level security;
alter table meters disable row level security;
alter table readings disable row level security;
alter table certificates disable row level security;

drop function if exists auth.cooperative_id();
drop function if exists auth.is_admin();
