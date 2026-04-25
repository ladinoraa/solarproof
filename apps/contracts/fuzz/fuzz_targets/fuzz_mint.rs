//! Fuzz target: energy_token::mint
//!
//! Exercises mint() with arbitrary (to_seed, amount) pairs.
//! Verifies that:
//!   - positive amounts always succeed and update balance/supply correctly
//!   - zero or negative amounts always panic (never silently corrupt state)
//!   - overflow is caught (no silent wrap-around)

#![no_main]

use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Env};
use energy_token::{EnergyToken, EnergyTokenClient};

fuzz_target!(|data: &[u8]| {
    if data.len() < 17 {
        return;
    }

    // Derive a deterministic i128 from the first 16 bytes
    let amount = i128::from_le_bytes(data[..16].try_into().unwrap());
    // Use the 17th byte as a seed selector (ignored — Address::generate is random per env)
    let _seed = data[16];

    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(EnergyToken, ());
    let client = EnergyTokenClient::new(&env, &id);
    let admin = Address::generate(&env);
    let minter = Address::generate(&env);
    client.initialize(&admin, &minter);
    let recipient = Address::generate(&env);

    if amount <= 0 {
        // Must panic — never silently accept non-positive amounts
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.mint(&recipient, &amount);
        }));
        assert!(result.is_err(), "mint({amount}) should have panicked");
        return;
    }

    // Positive amount: must succeed
    client.mint(&recipient, &amount);
    assert_eq!(client.balance(&recipient), amount);
    assert_eq!(client.total_supply(), amount);

    // Second mint: overflow must panic, not wrap
    if amount > i128::MAX / 2 {
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.mint(&recipient, &amount);
        }));
        assert!(result.is_err(), "double mint of large amount should overflow-panic");
    }
});
