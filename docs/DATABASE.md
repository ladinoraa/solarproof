# Database Schema

## Migration 001

```sql
create table cooperatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_address text not null,
  created_at timestamptz not null default now()
);

create table meters (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references cooperatives(id) on delete cascade,
  serial_number text not null unique,
  pubkey_hex text not null,   -- Ed25519 public key (64 hex chars = 32 bytes)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters(id) on delete cascade,
  kwh numeric(12,4) not null check (kwh > 0),
  timestamp timestamptz not null,
  reading_hash text not null unique,   -- SHA-256 hex
  signature_hex text not null,         -- Ed25519 signature hex (128 chars)
  anchor_tx_hash text,
  mint_tx_hash text,
  anchored boolean not null default false,
  minted boolean not null default false
);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references cooperatives(id) on delete cascade,
  reading_id uuid not null references readings(id),
  reading_hash text not null,
  anchor_tx_hash text not null,
  mint_tx_hash text not null unique,
  kwh numeric(12,4) not null,
  issued_at timestamptz not null default now(),
  retired boolean not null default false,
  retired_at timestamptz,
  retired_by text
);
```

## Migration 002 — indexes

```sql
create index on meters(cooperative_id);
create index on readings(meter_id);
create index on readings(reading_hash);
create index on certificates(cooperative_id);
create index on certificates(reading_hash);
create index on certificates(mint_tx_hash);
```
