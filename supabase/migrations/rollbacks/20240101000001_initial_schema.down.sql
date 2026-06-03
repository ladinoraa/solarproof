-- Rollback 001: drop initial schema tables (reverse dependency order)
drop table if exists certificates cascade;
drop table if exists readings cascade;
drop table if exists meters cascade;
drop table if exists cooperatives cascade;
