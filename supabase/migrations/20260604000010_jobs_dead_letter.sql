-- Migration: add dead-letter queue tracking to jobs table
-- Adds a `dead_lettered_at` column to flag jobs permanently failed after
-- all BullMQ retries are exhausted.

alter table jobs
  add column if not exists dead_lettered_at timestamptz;

create index if not exists jobs_dead_lettered on jobs (dead_lettered_at)
  where dead_lettered_at is not null;
