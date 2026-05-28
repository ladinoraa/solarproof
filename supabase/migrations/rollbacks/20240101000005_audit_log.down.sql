-- Rollback 005a: drop audit_log table and its indexes/rules
drop table if exists audit_log cascade;
