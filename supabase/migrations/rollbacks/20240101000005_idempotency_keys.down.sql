-- Rollback 005c: drop idempotency_keys table
drop table if exists idempotency_keys cascade;
