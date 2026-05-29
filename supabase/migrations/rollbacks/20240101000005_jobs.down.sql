-- Rollback 005b: drop jobs table, trigger, and helper function
drop table if exists jobs cascade;
drop function if exists set_updated_at() cascade;
