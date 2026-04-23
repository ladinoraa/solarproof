//! # Energy Token (`energy-token`)
//!
//! SEP-41 fungible certificate token representing verified renewable energy.
//! **1 token = 1 kWh** of generation that has been cryptographically anchored
//! on-chain via the `audit_registry` contract.
//!
//! ## Roles
//! | Role | Description |
//! |------|-------------|
//! | `admin` | Set at initialisation; can rotate the `minter` address. |
//! | `minter` | The only address authorised to call `mint()`. Should be the SolarProof API keypair. |
//!
//! ## Invariants
//! 1. `total_supply() == total_minted - total_burned` at all times.
//! 2. No address can hold a negative balance.
//! 3. `mint()` and `set_minter()` require the respective role's authorisation.
//! 4. `burn()` and `transfer()` require the token holder's authorisation.
//!
//! ## Known limitations / out-of-scope
//! - No allowance / approve mechanism (not required for current use-case).
//! - No pause / freeze functionality.
//! - Balances stored in `persistent` storage; TTL extension not implemented.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

/// Enumeration of all instance-storage keys used by this contract.
#[contracttype]
pub enum DataKey {
    /// `Address` — the contract administrator.
    Admin,
    /// `Address` — the only address permitted to mint tokens.
    Minter,
    /// `i128` — cumulative tokens ever minted (never decremented).
    TotalMinted,
    /// `i128` — cumulative tokens ever burned (never decremented).
    TotalBurned,
    Paused,
}

#[derive(Debug)]
pub enum TokenError {
    Overflow = 1,
}

impl From<TokenError> for soroban_sdk::Error {
    fn from(e: TokenError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

#[contract]
pub struct EnergyToken;

#[contractimpl]
impl EnergyToken {
    /// Initialise the contract.
    ///
    /// # Arguments
    /// * `admin`  — address that can rotate the minter.
    /// * `minter` — address authorised to mint tokens (typically the API keypair).
    ///
    /// # Panics
    /// Panics with `"already initialized"` if called more than once.
    pub fn initialize(env: Env, admin: Address, minter: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::TotalMinted, &0_i128);
        env.storage().instance().set(&DataKey::TotalBurned, &0_i128);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Returns the human-readable token name.
    pub fn name(env: Env) -> String { String::from_str(&env, "SolarProof Energy Certificate") }

    /// Returns the token ticker symbol.
    pub fn symbol(env: Env) -> String { String::from_str(&env, "SPEC") }

    /// Returns the number of decimal places (7, matching Stellar stroops).
    pub fn decimals(_env: Env) -> u32 { 7 }

    /// Mint `amount` tokens to `to`.
    ///
    /// # Arguments
    /// * `to`     — recipient address.
    /// * `amount` — number of stroops to mint (must be > 0).
    ///
    /// # Authorization
    /// Requires `minter` authorisation.
    ///
    /// # Panics
    /// * `"amount must be positive"` if `amount <= 0`.
    ///
    /// # Events
    /// Emits `(topic: "mint", data: (to, amount))`.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).expect("not initialized");
        minter.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);

        let key = (symbol_short!("balance"), to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_bal = bal.checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: balance"));
        env.storage().persistent().set(&key, &new_bal);

        let total: i128 = env.storage().instance().get(&DataKey::TotalMinted).unwrap_or(0);
        let new_total = total.checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: total_minted"));
        env.storage().instance().set(&DataKey::TotalMinted, &new_total);

        env.events().publish((symbol_short!("mint"),), (to, amount));
    }

    /// Burn `amount` tokens from `from` (certificate retirement).
    ///
    /// # Arguments
    /// * `from`   — address whose tokens are burned.
    /// * `amount` — number of stroops to burn (must be > 0).
    ///
    /// # Authorization
    /// Requires `from` authorisation.
    ///
    /// # Panics
    /// * `"amount must be positive"` if `amount <= 0`.
    /// * `"no balance"` if `from` has no balance entry.
    /// * `"insufficient balance"` if `from` holds fewer tokens than `amount`.
    ///
    /// # Events
    /// Emits `(topic: "burn", data: (from, amount))`.
    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);

        let key = (symbol_short!("balance"), from.clone());
        let bal: i128 = env.storage().persistent().get(&key).expect("no balance");
        assert!(bal >= amount, "insufficient balance");
        env.storage().persistent().set(&key, &(bal - amount));

        let total: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        let new_total = total.checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: total_burned"));
        env.storage().instance().set(&DataKey::TotalBurned, &new_total);

        env.events().publish((symbol_short!("burn"),), (from, amount));
    }

    /// Transfer `amount` tokens from `from` to `to`.
    ///
    /// # Arguments
    /// * `from`   — sender address.
    /// * `to`     — recipient address.
    /// * `amount` — number of stroops to transfer (must be > 0).
    ///
    /// # Authorization
    /// Requires `from` authorisation.
    ///
    /// # Panics
    /// * `"amount must be positive"` if `amount <= 0`.
    /// * `"no balance"` if `from` has no balance entry.
    /// * `"insufficient balance"` if `from` holds fewer tokens than `amount`.
    ///
    /// # Events
    /// Emits `(topic: "transfer", data: (from, to, amount))`.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);

        let fk = (symbol_short!("balance"), from.clone());
        let fb: i128 = env.storage().persistent().get(&fk).expect("no balance");
        assert!(fb >= amount, "insufficient balance");

        let tk = (symbol_short!("balance"), to.clone());
        let tb: i128 = env.storage().persistent().get(&tk).unwrap_or(0);

        env.storage().persistent().set(&fk, &(fb - amount));
        let new_tb = tb.checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: recipient balance"));
        env.storage().persistent().set(&tk, &new_tb);
        env.events().publish((symbol_short!("transfer"),), (from, to, amount));
    }

    /// Returns the token balance of `account` in stroops.
    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&(symbol_short!("balance"), account)).unwrap_or(0)
    }

    /// Returns the current circulating supply (`total_minted - total_burned`).
    pub fn total_supply(env: Env) -> i128 {
        let minted: i128 = env.storage().instance().get(&DataKey::TotalMinted).unwrap_or(0);
        let burned: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        minted - burned
    }

    /// Rotate the minter address.
    ///
    /// # Authorization
    /// Requires `admin` authorisation.
    pub fn set_minter(env: Env, new_minter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Minter, &new_minter);
    }

    /// Returns the current admin address.
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
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, EnergyTokenClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(EnergyToken, ());
        let client = EnergyTokenClient::new(&env, &id);
        let admin = Address::generate(&env);
        let minter = Address::generate(&env);
        client.initialize(&admin, &minter);
        (env, admin, client)
    }

    #[test]
    fn test_mint_burn_supply() {
        let (env, _, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &1000_i128);
        assert_eq!(client.total_supply(), 1000_i128);
        client.burn(&user, &400_i128);
        assert_eq!(client.total_supply(), 600_i128);
        assert_eq!(client.balance(&user), 600_i128);
    }

    #[test]
    fn test_transfer() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let b = Address::generate(&env);
        client.mint(&a, &500_i128);
        client.transfer(&a, &b, &200_i128);
        assert_eq!(client.balance(&a), 300_i128);
        assert_eq!(client.balance(&b), 200_i128);
    }

    #[test]
    fn test_metadata() {
        let (env, _, client) = setup();
        assert_eq!(client.symbol(), String::from_str(&env, "SPEC"));
        assert_eq!(client.decimals(), 7);
    }

    #[test]
    fn test_version() {
        let (_, client) = setup();
        assert_eq!(client.get_version(), String::from_str(&soroban_sdk::Env::default(), "1.0.0"));
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_burn_overdraft() {
        let (env, _, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &10_i128);
        client.burn(&user, &100_i128);
    }

    /// Minting exactly i128::MAX should succeed.
    #[test]
    fn test_mint_max_i128() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &i128::MAX);
        assert_eq!(client.balance(&user), i128::MAX);
        assert_eq!(client.total_supply(), i128::MAX);
    }

    /// Minting beyond i128::MAX must panic with overflow message.
    #[test]
    #[should_panic(expected = "overflow: balance")]
    fn test_mint_overflow_panics() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &i128::MAX);
        // Second mint of 1 would overflow the balance
        client.mint(&user, &1_i128);
    }

    /// Fuzz-style: mint a range of large amounts and verify supply stays consistent.
    #[test]
    fn test_fuzz_mint_amounts() {
        let amounts: &[i128] = &[
            1,
            1_000,
            1_000_000,
            1_000_000_000,
            1_000_000_000_000,
            i128::MAX / 4,
            i128::MAX / 2,
        ];
        for &amount in amounts {
            let env = Env::default();
            env.mock_all_auths();
            let id = env.register(EnergyToken, ());
            let client = EnergyTokenClient::new(&env, &id);
            let admin = Address::generate(&env);
            let minter = Address::generate(&env);
            client.initialize(&admin, &minter);
            let user = Address::generate(&env);
            client.mint(&user, &amount);
            assert_eq!(client.balance(&user), amount);
            assert_eq!(client.total_supply(), amount);
        }
    }
}
