//! # Audit Registry
//!
//! Immutable on-chain anchor of Ed25519-signed meter readings.
//!
//! ## Storage optimisation (issue #59)
//! Only the `reading_hash` (32 bytes) and `anchored_at_ledger` (4 bytes) are
//! stored on-chain.  The full payload (meter_pubkey, signature, kwh_stroops,
//! meter_id, timestamp) is stored off-chain in Supabase, keyed by
//! `reading_hash`.  Verification is still possible from the on-chain hash
//! alone: callers recompute `sha256(meter_id || kwh_stroops_le || timestamp_le)`
//! and check `is_anchored(hash)`.
//!
//! ## Flow
//! 1. Smart meter signs `sha256(meter_id || kwh || timestamp)` with its Ed25519 key
//! 2. API verifies the signature off-chain, then calls `anchor(reading_hash)`
//! 3. Contract stores only the hash + ledger sequence permanently
//! 4. `energy_token.mint()` can reference the anchor as proof of physical generation

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, BytesN, Env};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Minimal on-chain record — 36 bytes vs ~200+ bytes previously.
#[contracttype]
#[derive(Clone)]
pub struct AuditAnchor {
    /// SHA-256 of (meter_id || kwh_stroops_le || timestamp_unix_le)
    pub reading_hash: BytesN<32>,
    /// Stellar ledger sequence at anchor time
    pub anchored_at_ledger: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    /// reading_hash → AuditAnchor
    Anchor(BytesN<32>),
    TotalAnchors,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct AuditRegistry;

#[contractimpl]
impl AuditRegistry {
    pub fn initialize(env: Env, admin: soroban_sdk::Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalAnchors, &0_u32);
    }

    /// Anchor a reading hash on-chain.
    ///
    /// Signature verification is performed off-chain by the API before calling
    /// this function.  Only the hash is stored; full payload lives in Supabase.
    /// Once anchored, a hash cannot be overwritten.
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

    /// Returns the anchor record if the hash is anchored, otherwise None.
    pub fn verify(env: Env, reading_hash: BytesN<32>) -> Option<AuditAnchor> {
        env.storage().persistent().get(&DataKey::Anchor(reading_hash))
    }

    /// Returns true if the reading hash is anchored.
    pub fn is_anchored(env: Env, reading_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Anchor(reading_hash))
    }

    pub fn total_anchors(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalAnchors).unwrap_or(0)
    }

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
}
