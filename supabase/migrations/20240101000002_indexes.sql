-- Migration 002: indexes for common query patterns

create index on meters(cooperative_id);
create index on readings(meter_id);
create index on readings(reading_hash);
create index on certificates(cooperative_id);
create index on certificates(reading_hash);
create index on certificates(mint_tx_hash);
