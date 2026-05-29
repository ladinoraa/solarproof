-- Rollback 006: drop webhook tables
drop table if exists webhook_logs cascade;
drop table if exists webhook_endpoints cascade;
