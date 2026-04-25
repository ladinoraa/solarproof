//! Fuzz target: audit_registry::anchor
//!
//! Exercises anchor() with arbitrary 32-byte hashes.
//! Verifies that:
//!   - any 32-byte hash can be anchored exactly once
//!   - duplicate anchors always return AlreadyAnchored
//!   - total_anchors is monotonically increasing

#![no_main]

use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};
use audit_registry::{AuditRegistry, AuditRegistryClient, Error};

fuzz_target!(|data: &[u8]| {
    if data.len() < 32 {
        return;
    }

    let hash_bytes: [u8; 32] = data[..32].try_into().unwrap();

    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(AuditRegistry, ());
    let client = AuditRegistryClient::new(&env, &id);
    let admin = Address::generate(&env);
    let api_signer = Address::generate(&env);
    client.initialize(&admin, &api_signer);

    let hash = BytesN::from_array(&env, &hash_bytes);

    // First anchor must succeed
    let result = client.anchor(&api_signer, &hash);
    assert_eq!(result, Ok(()), "first anchor should succeed");
    assert!(client.is_anchored(&hash));
    assert_eq!(client.total_anchors(), 1);

    // Duplicate anchor must return AlreadyAnchored
    let dup = client.anchor(&api_signer, &hash);
    assert_eq!(dup, Err(Error::AlreadyAnchored), "duplicate anchor should fail");
    assert_eq!(client.total_anchors(), 1, "count must not increment on duplicate");

    // Verify stored anchor matches input
    let stored = client.verify(&hash).expect("anchor should be retrievable");
    assert_eq!(stored.reading_hash, hash);
});
