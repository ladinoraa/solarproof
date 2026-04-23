# energy_token

SEP-41 fungible certificate token. **1 token = 1 kWh** of verified renewable energy.

Minting requires a valid audit anchor in `audit_registry` for the same reading hash.

- **Symbol:** `SPEC`
- **Decimals:** `7` (amounts in stroops: 1 kWh = `10_000_000`)
- **SDK:** Soroban SDK 23.1.0 / OpenZeppelin Stellar v0.5.1

---

## Functions

### `initialize(env, admin, minter)`

One-time setup. Panics if called again.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Account authorized to call `set_minter` |
| `minter` | `Address` | Account authorized to call `mint` |

---

### `mint(env, to, amount)`

Mints `amount` tokens to `to`. Requires `minter` auth.

| Parameter | Type | Description |
|---|---|---|
| `to` | `Address` | Recipient address |
| `amount` | `i128` | Amount in stroops (must be > 0) |

Emits event: `("mint", (to, amount))`

**Example:**
```bash
stellar contract invoke --id <CONTRACT_ID> -- mint \
  --to GABC...XYZ \
  --amount 10000000
```

---

### `burn(env, from, amount)`

Burns `amount` tokens from `from`. Requires `from` auth.

| Parameter | Type | Description |
|---|---|---|
| `from` | `Address` | Token holder |
| `amount` | `i128` | Amount in stroops (must be > 0, ≤ balance) |

Emits event: `("burn", (from, amount))`

---

### `transfer(env, from, to, amount)`

Transfers `amount` from `from` to `to`. Requires `from` auth.

| Parameter | Type | Description |
|---|---|---|
| `from` | `Address` | Sender |
| `to` | `Address` | Recipient |
| `amount` | `i128` | Amount in stroops (must be > 0, ≤ balance) |

Emits event: `("transfer", (from, to, amount))`

---

### `balance(env, account) → i128`

Returns the token balance of `account` in stroops.

---

### `total_supply(env) → i128`

Returns `total_minted - total_burned`.

---

### `set_minter(env, new_minter)`

Replaces the authorized minter. Requires `admin` auth.

---

### `admin(env) → Address`

Returns the admin address.

---

### `name(env) → String`

Returns `"SolarProof Energy Certificate"`.

### `symbol(env) → String`

Returns `"SPEC"`.

### `decimals(env) → u32`

Returns `7`.

---

## Error Codes

| Panic message | Cause |
|---|---|
| `"already initialized"` | `initialize` called more than once |
| `"amount must be positive"` | `amount ≤ 0` passed to `mint`, `burn`, or `transfer` |
| `"no balance"` | `burn` called on account with no balance entry |
| `"insufficient balance"` | `burn` or `transfer` amount exceeds balance |
| `"not initialized"` | Contract called before `initialize` |
