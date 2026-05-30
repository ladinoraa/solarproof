-- Rollback 002: drop indexes added in migration 002
drop index if exists meters_cooperative_id_idx;
drop index if exists readings_meter_id_idx;
drop index if exists readings_reading_hash_idx;
drop index if exists certificates_cooperative_id_idx;
drop index if exists certificates_reading_hash_idx;
drop index if exists certificates_mint_tx_hash_idx;
