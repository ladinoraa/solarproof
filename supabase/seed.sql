-- Seed data for local development
-- Run automatically by: supabase db reset

insert into cooperatives (id, name, admin_address) values
  ('00000000-0000-0000-0000-000000000001', 'Demo Cooperative', 'GDEMO1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

insert into meters (id, cooperative_id, serial_number, pubkey_hex) values
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'METER-001',
    -- placeholder Ed25519 pubkey (32 zero bytes)
    '0000000000000000000000000000000000000000000000000000000000000000'
  );
