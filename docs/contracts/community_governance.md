# community_governance

Cooperative on-chain governance — token holders submit proposals and vote. A proposal passes when `yes_votes / total_votes ≥ quorum%` after the voting period ends.

- **SDK:** Soroban SDK 23.1.0 / OpenZeppelin Stellar v0.5.1

---

## Types

### `Proposal`

| Field | Type | Description |
|---|---|---|
| `id` | `u32` | Auto-incremented proposal ID |
| `proposer` | `Address` | Address that submitted the proposal |
| `title` | `String` | Short title |
| `description` | `String` | Full proposal description |
| `yes_votes` | `u32` | Count of approve votes |
| `no_votes` | `u32` | Count of reject votes |
| `end_ledger` | `u32` | Ledger sequence after which voting closes |
| `status` | `ProposalStatus` | Current status |

### `ProposalStatus`

| Variant | Description |
|---|---|
| `Active` | Voting is open |
| `Passed` | Yes votes met quorum after period ended |
| `Rejected` | Yes votes did not meet quorum |
| `Expired` | No votes were cast before period ended |

---

## Functions

### `initialize(env, admin, quorum, voting_period_ledgers)`

One-time setup. Panics if called again.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Contract admin |
| `quorum` | `u32` | Minimum yes-vote percentage to pass (1–100) |
| `voting_period_ledgers` | `u32` | Number of ledgers a proposal stays open |

---

### `propose(env, proposer, title, description) → u32`

Creates a new proposal. Requires `proposer` auth.

| Parameter | Type | Description |
|---|---|---|
| `proposer` | `Address` | Proposal author |
| `title` | `String` | Short title |
| `description` | `String` | Full description |

Returns: new proposal ID (`u32`)  
Emits event: `("propose", proposal_id)`

**Example:**
```bash
stellar contract invoke --id <CONTRACT_ID> -- propose \
  --proposer GABC...XYZ \
  --title "Add batch anchor support" \
  --description "Allow anchoring multiple readings in one transaction"
```

---

### `vote(env, voter, proposal_id, approve)`

Casts a vote. Requires `voter` auth. Each address may vote once per proposal.

| Parameter | Type | Description |
|---|---|---|
| `voter` | `Address` | Voter address |
| `proposal_id` | `u32` | Target proposal |
| `approve` | `bool` | `true` = yes, `false` = no |

Emits event: `("vote", (proposal_id, voter, approve))`

---

### `finalize(env, proposal_id)`

Resolves a proposal after its voting period ends. Anyone can call this.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u32` | Proposal to finalize |

Sets status to `Passed`, `Rejected`, or `Expired`.  
Emits event: `("final", (proposal_id, status))`

---

### `get_proposal(env, proposal_id) → Option<Proposal>`

Returns the full `Proposal` struct, or `None` if the ID doesn't exist.

---

### `proposal_count(env) → u32`

Returns the total number of proposals created.

---

## Error Codes

| Panic message | Cause |
|---|---|
| `"already initialized"` | `initialize` called more than once |
| `"not initialized"` | Contract called before `initialize` |
| `"quorum must be 1-100"` | `quorum` out of valid range |
| `"already voted"` | Voter has already cast a vote on this proposal |
| `"proposal not found"` | `proposal_id` does not exist |
| `"proposal not active"` | Voting or finalization attempted on a non-`Active` proposal |
| `"voting period ended"` | `vote` called after `end_ledger` |
| `"already finalized"` | `finalize` called on a non-`Active` proposal |
| `"voting still open"` | `finalize` called before `end_ledger` has passed |

---

## Events

| Topic | Data | Emitted by |
|---|---|---|
| `"propose"` | `proposal_id: u32` | `propose` |
| `"vote"` | `(proposal_id: u32, voter: Address, approve: bool)` | `vote` |
| `"final"` | `(proposal_id: u32, status: ProposalStatus)` | `finalize` |
| `"upg_prop"` | `(new_wasm_hash: BytesN<32>, unlock_ledger: u32)` | `propose_upgrade` |
| `"upg_cncl"` | `()` | `cancel_upgrade` |
| `"upg_exec"` | `new_wasm_hash: BytesN<32>` | `execute_upgrade` |
