-- Migration: add name to meters, mint_diagnosis to readings
-- Closes #30 (name field) and #32 (tracer-sim diagnosis storage)

alter table meters
  add column if not exists name text not null default '';

alter table readings
  add column if not exists mint_diagnosis jsonb;
