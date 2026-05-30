# Soroban Contract Interface Documentation

This document describes the public interfaces for SolarProof's three Soroban contracts.
It includes function signatures, parameters, return values, error conditions, event names, and example Stellar CLI invocations.

## energy_token

### Description
SEP-41 compliant certificate token where 1 token = 1 kWh of verified renewable energy.

### Public functions

- `initialize(admin: Address, minter: Address)`
  - `admin`: contract administrator address
  - `minter`: authorized minter address
  - Returns: `()`
  - Errors: `already initialized` if the contract is already initialized

- `name() -> String`
  - Returns: token name `SolarProof Energy Certificate`

- `symbol() -> String`
  - Returns: token symbol `SPEC`

- `decimals() -> u32`
  - Returns: `7`

- `mint(to: Address, amount: i128)`
  - `to`: recipient account
  - `amount`: amount in token stroops
  - Returns: `()`
  - Authorization: requires `minter` signature
  - Errors: `not initialized`, `amount must be positive`
  - Emits: `mint` event `(to, amount)`

- `burn(from: Address, amount: i128)`
  - `from`: account burning tokens
  - `amount`: burn amount in token stroops
  - Returns: `()`
  - Authorization: requires `from` signature
  - Errors: `amount must be positive`, `no balance`, `insufficient balance`
  - Emits: `burn` event `(from, amount)`

- `transfer(from: Address, to: Address, amount: i128)`
  - `from`: sender address
  - `to`: recipient address
  - `amount`: transfer amount in token stroops
  - Returns: `()`
  - Authorization: requires `from` signature
  - Errors: `amount must be positive`, `no balance`, `insufficient balance`
  - Emits: `transfer` event `(from, to, amount)`

- `balance(account: Address) -> i128`
  - Returns: current token balance for `account`

- `total_supply() -> i128`
  - Returns: total minted minus burned tokens

- `set_minter(new_minter: Address)`
  - `new_minter`: address to authorize as minter
  - Returns: `()`
  - Authorization: requires current `admin` signature
  - Errors: `not initialized`

- `admin() -> Address`
  - Returns: current admin address
  - Errors: `not initialized`

### Events

- `mint`: published on successful `mint`
- `burn`: published on successful `burn`
- `transfer`: published on successful `transfer`

### Example CLI invocations

```bash
stellar contract invoke --id $TOKEN_ID --source $MINTER_SECRET_KEY --network testnet \
  -- mint --to RECIPIENT_ADDRESS --amount 100000000

stellar contract invoke --id $TOKEN_ID --source $OWNER_SECRET_KEY --network testnet \
  -- set_minter --new_minter NEW_MINTER_ADDRESS
```

## audit_registry

### Description
Immutable on-chain anchor of Ed25519-signed meter readings for later verification.

### Public functions

- `initialize(admin: Address)`
  - `admin`: contract administrator address
  - Returns: `()`
  - Errors: `already initialized`

- `anchor(reading_hash: BytesN<32>, meter_pubkey: BytesN<32>, signature: BytesN<64>, kwh_stroops: i128, meter_id: String, timestamp: u64)`
  - `reading_hash`: SHA-256 digest of `(meter_id || kwh_stroops || timestamp)`
  - `meter_pubkey`: meter device Ed25519 public key
  - `signature`: signature over `reading_hash`
  - `kwh_stroops`: reading energy in stroops (`kwh * 10^7`)
  - `meter_id`: meter identifier string
  - `timestamp`: Unix timestamp of the reading
  - Returns: `()`
  - Errors: `reading already anchored`, `kwh must be positive`, signature verification failure
  - Emits: `anchor` event with `reading_hash`

- `verify(reading_hash: BytesN<32>) -> Option<AuditAnchor>`
  - `reading_hash`: SHA-256 digest used during anchor creation
  - Returns: `Some(AuditAnchor)` when the reading has been anchored, otherwise `None`
  - Use this method to retrieve the on-chain audit record and confirm the anchor exists

- `is_anchored(reading_hash: BytesN<32>) -> bool`
  - `reading_hash`: SHA-256 anchor identifier
  - Returns: `true` if the reading hash has a stored anchor

- `total_anchors() -> u32`
  - Returns the total number of anchored readings

- `admin() -> Address`
  - Returns admin address
  - Errors: `not initialized`

### Audit anchor record format

- `reading_hash: BytesN<32>`
- `meter_pubkey: BytesN<32>`
- `signature: BytesN<64>`
- `kwh_stroops: i128`
- `meter_id: String`
- `timestamp: u64`
- `anchored_at_ledger: u32`

### Example CLI invocations

```bash
stellar contract invoke --id $REGISTRY_ID --source $METER_SECRET_KEY --network testnet \
  -- anchor --reading_hash 32_BYTE_HEX --meter_pubkey 32_BYTE_HEX --signature 64_BYTE_HEX \
  --kwh_stroops 100000000 --meter_id METER-001 --timestamp 1700000000

stellar contract invoke --id $REGISTRY_ID --network testnet \
  -- verify --reading_hash 32_BYTE_HEX

stellar contract invoke --id $TOKEN_ID --network testnet \
  -- balance --account RECIPIENT_ADDRESS
```

## community_governance

### Description
Cooperative governance contract for proposal creation, voting, and proposal finalization.

### Public types

- `ProposalStatus`: `Active`, `Passed`, `Rejected`, `Expired`
- `VoteChoice`: `For`, `Against`, `Abstain`

### Public functions

- `initialize(admin: Address, quorum: u32, voting_period_ledgers: u32)`
  - `admin`: contract administrator
  - `quorum`: pass threshold as percentage (1..100)
  - `voting_period_ledgers`: ledger span for voting
  - Returns: `()`
  - Errors: `already initialized`, `quorum must be 1-100`

- `propose(proposer: Address, title: String, description: String) -> u32`
  - `proposer`: address creating the proposal
  - `title`: proposal title, non-empty
  - `description`: proposal description, non-empty
  - Returns: new proposal ID
  - Authorization: requires `proposer` signature
  - Errors: `title cannot be empty`, `description cannot be empty`

- `vote(voter: Address, proposal_id: u32, vote: VoteChoice)`
  - `voter`: address casting the vote
  - `proposal_id`: target proposal
  - `vote`: `For`, `Against`, or `Abstain`
  - Returns: `()`
  - Authorization: requires `voter` signature
  - Errors: `already voted`, `proposal not found`, `proposal not active`, `voting period ended`

- `finalize(proposal_id: u32)`
  - `proposal_id`: target proposal
  - Returns: `()`
  - Errors: `proposal not found`, `already finalized`, `voting still open`
  - Logic: evaluates quorum on total votes and sets final status
  - Emits: `final` event `(proposal_id, status)`

- `get_proposal(proposal_id: u32) -> Option<Proposal>`
  - Returns stored proposal or `None`

- `proposal_count() -> u32`
  - Returns count of proposals created

### Example CLI invocations

```bash
stellar contract invoke --id $GOV_ID --source $PROPOSER_SECRET_KEY --network testnet \
  -- propose --proposer PROPOSER_ADDRESS --title "Add new feature" --description "Expand governance rules"

stellar contract invoke --id $GOV_ID --source $VOTER_SECRET_KEY --network testnet \
  -- vote --voter VOTER_ADDRESS --proposal_id 1 --vote For

stellar contract invoke --id $GOV_ID --source $PROPOSER_SECRET_KEY --network testnet \
  -- finalize --proposal_id 1
```

## Contract addresses

### Testnet
- `energy_token`: `TESTNET_ENERGY_TOKEN_ID`
- `audit_registry`: `TESTNET_AUDIT_REGISTRY_ID`
- `community_governance`: `TESTNET_COMMUNITY_GOVERNANCE_ID`

### Mainnet
- `energy_token`: `MAINNET_ENERGY_TOKEN_ID`
- `audit_registry`: `MAINNET_AUDIT_REGISTRY_ID`
- `community_governance`: `MAINNET_COMMUNITY_GOVERNANCE_ID`

> Replace the placeholder values with the deployed contract IDs from your environment.
