//! # Audit Registry
//!
//! Immutable on-chain anchor of Ed25519-signed meter readings.
//!
//! ## Flow
//! 1. Smart meter signs `sha256(meter_id || kwh || timestamp)` with its Ed25519 key
//! 2. API calls `anchor(reading_hash, meter_pubkey, signature, kwh, meter_id)`
//! 3. Contract verifies the signature and stores the anchor permanently
//! 4. `energy_token.mint()` can reference the anchor as proof of physical generation
//!
//! ## Verification
//! Anyone can call `verify(reading_hash)` to confirm a reading is anchored
//! and retrieve its full audit record.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct AuditAnchor {
    /// SHA-256 of (meter_id || kwh_stroops || timestamp_unix)
    pub reading_hash: BytesN<32>,
    /// Ed25519 public key of the meter device (32 bytes)
    pub meter_pubkey: BytesN<32>,
    /// Ed25519 signature over reading_hash (64 bytes)
    pub signature: BytesN<64>,
    /// Energy in stroops (kwh * 10^7)
    pub kwh_stroops: i128,
    /// Meter device identifier
    pub meter_id: soroban_sdk::String,
    /// Unix timestamp of the reading
    pub timestamp: u64,
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
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalAnchors, &0_u32);
    }

    /// Anchor a signed meter reading on-chain.
    ///
    /// The contract verifies the Ed25519 signature before storing.
    /// Once anchored, a reading cannot be overwritten.
    pub fn anchor(
        env: Env,
        reading_hash: BytesN<32>,
        meter_pubkey: BytesN<32>,
        signature: BytesN<64>,
        kwh_stroops: i128,
        meter_id: soroban_sdk::String,
        timestamp: u64,
    ) {
        // Prevent duplicate anchors.
        let key = DataKey::Anchor(reading_hash.clone());
        if env.storage().persistent().has(&key) {
            panic!("reading already anchored");
        }

        assert!(kwh_stroops > 0, "kwh must be positive");

        // Verify Ed25519 signature: sig over reading_hash bytes.
        env.crypto().ed25519_verify(
            &meter_pubkey,
            &Bytes::from_slice(&env, reading_hash.to_array().as_ref()),
            &signature,
        );

        let anchor = AuditAnchor {
            reading_hash: reading_hash.clone(),
            meter_pubkey,
            signature,
            kwh_stroops,
            meter_id,
            timestamp,
            anchored_at_ledger: env.ledger().sequence(),
        };

        env.storage().persistent().set(&key, &anchor);

        let count: u32 = env.storage().instance().get(&DataKey::TotalAnchors).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalAnchors, &(count + 1));

        env.events().publish((symbol_short!("anchor"),), reading_hash);
    }

    /// Verify a reading is anchored and return its audit record.
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

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, ed25519::Sign},
        Env,
    };

    fn setup() -> (Env, AuditRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(AuditRegistry, ());
        let client = AuditRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client)
    }

    fn make_reading_hash(env: &Env) -> BytesN<32> {
        // Deterministic test hash
        BytesN::from_array(env, &[1u8; 32])
    }

    #[test]
    fn test_anchor_and_verify() {
        let (env, client) = setup();

        // Generate a real Ed25519 keypair via Soroban testutils
        let signer = soroban_sdk::testutils::ed25519::Signer::generate(&env);
        let reading_hash = make_reading_hash(&env);
        let sig = signer.sign(&env, &Bytes::from_slice(&env, reading_hash.to_array().as_ref()));

        client.anchor(
            &reading_hash,
            &signer.public_key(&env),
            &sig,
            &1_000_000_0_i128,
            &soroban_sdk::String::from_str(&env, "METER-001"),
            &1_700_000_000_u64,
        );

        assert!(client.is_anchored(&reading_hash));
        assert_eq!(client.total_anchors(), 1);

        let anchor = client.verify(&reading_hash).unwrap();
        assert_eq!(anchor.kwh_stroops, 1_000_000_0_i128);
    }

    #[test]
    #[should_panic(expected = "reading already anchored")]
    fn test_duplicate_anchor_rejected() {
        let (env, client) = setup();
        let signer = soroban_sdk::testutils::ed25519::Signer::generate(&env);
        let reading_hash = make_reading_hash(&env);
        let sig = signer.sign(&env, &Bytes::from_slice(&env, reading_hash.to_array().as_ref()));

        client.anchor(&reading_hash, &signer.public_key(&env), &sig, &100_i128,
            &soroban_sdk::String::from_str(&env, "METER-001"), &1_700_000_000_u64);
        // Second call must panic
        client.anchor(&reading_hash, &signer.public_key(&env), &sig, &100_i128,
            &soroban_sdk::String::from_str(&env, "METER-001"), &1_700_000_000_u64);
    }

    #[test]
    fn test_not_anchored_returns_none() {
        let (env, client) = setup();
        let hash = BytesN::from_array(&env, &[9u8; 32]);
        assert!(!client.is_anchored(&hash));
        assert!(client.verify(&hash).is_none());
    }
}
