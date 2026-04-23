# audit_registry

Immutable on-chain anchor of Ed25519-signed meter readings.

Once a reading is anchored it **cannot be overwritten**. The anchor serves as cryptographic proof that a physical meter generated the energy before `energy_token` mints a certificate.

- **SDK:** Soroban SDK 23.1.0 / OpenZeppelin Stellar v0.5.1

---

## Flow

```
1. Meter computes: reading_hash = sha256(meter_id || kwh_stroops || timestamp)
2. Meter signs reading_hash with its Ed25519 private key
3. API calls anchor(reading_hash, meter_pubkey, signature, kwh_stroops, meter_id, timestamp)
4. Contract verifies Ed25519 signature on-chain, then stores AuditAnchor permanently
5. energy_token.mint() references the anchor as proof of physical generation
```

---

## Types

### `AuditAnchor`

| Field | Type | Description |
|---|---|---|
| `reading_hash` | `BytesN<32>` | SHA-256 of `(meter_id \|\| kwh_stroops \|\| timestamp)` |
| `meter_pubkey` | `BytesN<32>` | Ed25519 public key of the meter device |
| `signature` | `BytesN<64>` | Ed25519 signature over `reading_hash` |
| `kwh_stroops` | `i128` | Energy in stroops (`kwh × 10^7`) |
| `meter_id` | `String` | Meter device identifier |
| `timestamp` | `u64` | Unix timestamp of the reading |
| `anchored_at_ledger` | `u32` | Stellar ledger sequence at anchor time |

---

## Functions

### `initialize(env, admin)`

One-time setup. Panics if called again.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Contract admin |

---

### `anchor(env, reading_hash, meter_pubkey, signature, kwh_stroops, meter_id, timestamp)`

Verifies the Ed25519 signature and stores the anchor permanently.

| Parameter | Type | Description |
|---|---|---|
| `reading_hash` | `BytesN<32>` | SHA-256 hash of the meter reading |
| `meter_pubkey` | `BytesN<32>` | Ed25519 public key of the meter |
| `signature` | `BytesN<64>` | Ed25519 signature over `reading_hash` |
| `kwh_stroops` | `i128` | Energy generated (must be > 0) |
| `meter_id` | `String` | Meter device identifier |
| `timestamp` | `u64` | Unix timestamp of the reading |

Returns: nothing  
Emits event: `("anchor", reading_hash)`

**Example:**
```bash
stellar contract invoke --id <CONTRACT_ID> -- anchor \
  --reading_hash <32-byte-hex> \
  --meter_pubkey <32-byte-hex> \
  --signature <64-byte-hex> \
  --kwh_stroops 125000000 \
  --meter_id "METER-001" \
  --timestamp 1700000000
```

---

### `verify(env, reading_hash) → Option<AuditAnchor>`

Returns the full `AuditAnchor` for the given hash, or `None` if not anchored.

| Parameter | Type | Description |
|---|---|---|
| `reading_hash` | `BytesN<32>` | Hash to look up |

---

### `is_anchored(env, reading_hash) → bool`

Returns `true` if the reading hash has been anchored.

---

### `total_anchors(env) → u32`

Returns the total number of anchored readings.

---

### `admin(env) → Address`

Returns the admin address.

---

## Error Codes

| Panic message | Cause |
|---|---|
| `"already initialized"` | `initialize` called more than once |
| `"not initialized"` | Contract called before `initialize` |
| `"reading already anchored"` | `anchor` called with a `reading_hash` that already exists |
| `"kwh must be positive"` | `kwh_stroops ≤ 0` |
| Ed25519 verification failure | Invalid signature — Soroban host panics with a crypto error |
