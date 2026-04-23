//! # Audit Registry (`audit-registry`)
//!
//! Immutable on-chain anchor of Ed25519-signed meter readings.
//!
//! ## Purpose
//! Provides a tamper-proof, publicly verifiable record that a specific meter
//! reading hash was accepted by the SolarProof API at a known ledger sequence.
//! The full reading payload (pubkey, signature, kwh, meter_id, timestamp) is
//! stored off-chain in Supabase; only the 32-byte SHA-256 hash is stored here.
//!
//! ## Flow
//! 1. Smart meter signs `sha256(meter_id || kwh_stroops_le || timestamp_le)`
//!    with its Ed25519 private key.
//! 2. SolarProof API verifies the signature off-chain.
//! 3. API calls `anchor(reading_hash)` — stores hash + ledger sequence.
//! 4. `energy_token.mint()` references the anchor as proof of generation.
//! 5. Any party can call `is_anchored(hash)` to verify the reading was accepted.
//!
//! ## Storage layout
//! | Key | Storage type | Value | Size |
//! |-----|-------------|-------|------|
//! | `DataKey::Admin` | instance | `Address` | ~57 B |
//! | `DataKey::TotalAnchors` | instance | `u32` | 4 B |
//! | `DataKey::Anchor(hash)` | persistent | `AuditAnchor` | 36 B |
//!
//! ## Invariants
//! 1. Each `reading_hash` can be anchored at most once.
//! 2. `total_anchors` is monotonically increasing.
//! 3. `anchored_at_ledger` is set to the ledger sequence at anchor time and
//!    never mutated.
//!
//! ## Known limitations / out-of-scope
//! - No admin-gated removal of anchors (immutability is a feature).
//! - Persistent storage TTL extension not implemented; entries may expire on
//!   long-lived networks if not bumped.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, BytesN, Env};

const VERSION: &str = "1.0.0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Minimal on-chain record — 36 bytes per anchor entry.
///
/// The full reading payload lives in Supabase, keyed by `reading_hash`.
#[contracttype]
#[derive(Clone)]
pub struct AuditAnchor {
    /// SHA-256 of `(meter_id_utf8 || kwh_stroops_i64_le || timestamp_unix_u64_le)`.
    /// This is the canonical hash signed by the meter device.
    pub reading_hash: BytesN<32>,
    /// Stellar ledger sequence number at the time of anchoring.
    pub anchored_at_ledger: u32,
}

/// Enumeration of all storage keys used by this contract.
#[contracttype]
pub enum DataKey {
    /// `Address` — the contract administrator.
    Admin,
    /// `AuditAnchor` — keyed by the 32-byte reading hash.
    Anchor(BytesN<32>),
    /// `u32` — total number of anchors stored.
    TotalAnchors,
    Version,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// Immutable anchor registry for Ed25519-signed meter readings.
#[contract]
pub struct AuditRegistry;

#[contractimpl]
impl AuditRegistry {
    /// Initialise the contract.
    ///
    /// # Arguments
    /// * `admin` — address that administers the registry.
    ///
    /// # Panics
    /// Panics with `"already initialized"` if called more than once.
    pub fn initialize(env: Env, admin: soroban_sdk::Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalAnchors, &0_u32);
        env.storage().instance().set(&DataKey::Version, &soroban_sdk::String::from_str(&env, VERSION));
    }

    pub fn get_version(env: Env) -> soroban_sdk::String {
        env.storage().instance()
            .get(&DataKey::Version)
            .unwrap_or_else(|| soroban_sdk::String::from_str(&env, VERSION))
    }

    /// Migrate state schema to a new version. Admin-only.
    pub fn migrate(env: Env, new_version: soroban_sdk::String) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Version, &new_version);
    }

    /// Anchor a reading hash on-chain.
    ///
    /// The caller (SolarProof API) is responsible for verifying the Ed25519
    /// signature off-chain before invoking this function.  Only the hash is
    /// stored; the full payload lives in Supabase.
    ///
    /// # Arguments
    /// * `reading_hash` — SHA-256 of `(meter_id || kwh_stroops_le || timestamp_le)`.
    ///
    /// # Panics
    /// * `"reading already anchored"` if `reading_hash` has been anchored before.
    ///
    /// # Events
    /// Emits `(topic: "anchor", data: reading_hash)`.
    pub fn anchor(env: Env, reading_hash: BytesN<32>) {
        let key = DataKey::Anchor(reading_hash.clone());
        if env.storage().persistent().has(&key) {
            panic!("reading already anchored");
        }

        let anchor = AuditAnchor {
            reading_hash: reading_hash.clone(),
            anchored_at_ledger: env.ledger().sequence(),
        };

        env.storage().persistent().set(&key, &anchor);

        let count: u32 = env.storage().instance().get(&DataKey::TotalAnchors).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalAnchors, &(count + 1));

        env.events().publish((symbol_short!("anchor"),), reading_hash);
    }

    /// Returns the `AuditAnchor` for `reading_hash`, or `None` if not anchored.
    pub fn verify(env: Env, reading_hash: BytesN<32>) -> Option<AuditAnchor> {
        env.storage().persistent().get(&DataKey::Anchor(reading_hash))
    }

    /// Returns `true` if `reading_hash` has been anchored.
    pub fn is_anchored(env: Env, reading_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Anchor(reading_hash))
    }

    /// Returns the total number of anchored readings.
    pub fn total_anchors(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalAnchors).unwrap_or(0)
    }

    /// Returns the admin address.
    pub fn admin(env: Env) -> soroban_sdk::Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, AuditRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(AuditRegistry, ());
        let client = AuditRegistryClient::new(&env, &id);
        let admin = soroban_sdk::Address::generate(&env);
        client.initialize(&admin);
        (env, client)
    }

    fn hash(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[1u8; 32])
    }

    #[test]
    fn test_anchor_and_verify() {
        let (env, client) = setup();
        let h = hash(&env);
        client.anchor(&h);
        assert!(client.is_anchored(&h));
        assert_eq!(client.total_anchors(), 1);
        let anchor = client.verify(&h).unwrap();
        assert_eq!(anchor.reading_hash, h);
    }

    #[test]
    #[should_panic(expected = "reading already anchored")]
    fn test_duplicate_anchor_rejected() {
        let (env, client) = setup();
        let h = hash(&env);
        client.anchor(&h);
        client.anchor(&h);
    }

    #[test]
    fn test_not_anchored_returns_none() {
        let (env, client) = setup();
        let h = BytesN::from_array(&env, &[9u8; 32]);
        assert!(!client.is_anchored(&h));
        assert!(client.verify(&h).is_none());
    }

    /// Verify total_anchors increments correctly across multiple anchors.
    #[test]
    fn test_total_anchors_increments() {
        let (env, client) = setup();
        for i in 0u8..5 {
            client.anchor(&BytesN::from_array(&env, &[i; 32]));
        }
        assert_eq!(client.total_anchors(), 5);
    }

    /// Verify double-initialize is rejected.
    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_rejected() {
        let (env, client) = setup();
        client.initialize(&soroban_sdk::Address::generate(&env));
    }

    #[test]
    fn test_version() {
        let (env, client) = setup();
        assert_eq!(client.get_version(), soroban_sdk::String::from_str(&env, "1.0.0"));
    }
}
