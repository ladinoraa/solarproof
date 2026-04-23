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

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Admin,
    Minter,
    TotalMinted,
    TotalBurned,
    Paused,
    /// Allowance: (from, spender) -> i128
    Allowance(Address, Address),
}

#[contract]
pub struct EnergyToken;

#[contractimpl]
impl EnergyToken {
    /// Initialise the contract.
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

    // ── SEP-41 metadata ─────────────────────────────────────────────────────

    pub fn name(env: Env) -> String {
        String::from_str(&env, "SolarProof kWh")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "SKWH")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    // ── SEP-41 balance / transfer ────────────────────────────────────────────

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&(symbol_short!("balance"), account))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);
        Self::move_balance(&env, &from, &to, amount);
        env.events()
            .publish((symbol_short!("transfer"),), (from, to, amount));
    }

    // ── SEP-41 allowance / approve ───────────────────────────────────────────

    /// Returns the amount `spender` is allowed to spend on behalf of `from`.
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    /// Approve `spender` to spend up to `amount` tokens from `from`.
    ///
    /// # Authorization
    /// Requires `from` authorisation.
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        assert!(amount >= 0, "amount must be non-negative");
        env.storage()
            .persistent()
            .set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
        env.events()
            .publish((symbol_short!("approve"),), (from, spender, amount));
    }

    /// Transfer `amount` tokens from `from` to `to` using caller's allowance.
    ///
    /// # Authorization
    /// Requires `spender` (caller) authorisation.
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);
        Self::spend_allowance(&env, &from, &spender, amount);
        Self::move_balance(&env, &from, &to, amount);
        env.events()
            .publish((symbol_short!("transfer"),), (from, to, amount));
    }

    /// Burn `amount` tokens from `from` using caller's allowance.
    ///
    /// # Authorization
    /// Requires `spender` (caller) authorisation.
    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);
        Self::spend_allowance(&env, &from, &spender, amount);
        Self::deduct_balance(&env, &from, amount);
        Self::add_burned(&env, amount);
        env.events()
            .publish((symbol_short!("burn"),), (from, amount));
    }

    // ── Mint / burn (privileged) ─────────────────────────────────────────────

    pub fn mint(env: Env, to: Address, amount: i128) {
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .expect("not initialized");
        minter.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);

        let key = (symbol_short!("balance"), to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_bal = bal.checked_add(amount).unwrap_or_else(|| panic!("overflow: balance"));
        env.storage().persistent().set(&key, &new_bal);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalMinted)
            .unwrap_or(0);
        let new_total = total
            .checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: total_minted"));
        env.storage().instance().set(&DataKey::TotalMinted, &new_total);

        env.events().publish((symbol_short!("mint"),), (to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        Self::require_not_paused(&env);
        Self::deduct_balance(&env, &from, amount);
        Self::add_burned(&env, amount);
        env.events().publish((symbol_short!("burn"),), (from, amount));
    }

    pub fn total_supply(env: Env) -> i128 {
        let minted: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalMinted)
            .unwrap_or(0);
        let burned: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalBurned)
            .unwrap_or(0);
        minted - burned
    }

    pub fn set_minter(env: Env, new_minter: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Minter, &new_minter);
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        assert!(!paused, "contract is paused");
    }

    fn move_balance(env: &Env, from: &Address, to: &Address, amount: i128) {
        let fk = (symbol_short!("balance"), from.clone());
        let fb: i128 = env.storage().persistent().get(&fk).expect("no balance");
        assert!(fb >= amount, "insufficient balance");
        let tk = (symbol_short!("balance"), to.clone());
        let tb: i128 = env.storage().persistent().get(&tk).unwrap_or(0);
        env.storage().persistent().set(&fk, &(fb - amount));
        let new_tb = tb.checked_add(amount).unwrap_or_else(|| panic!("overflow: recipient balance"));
        env.storage().persistent().set(&tk, &new_tb);
    }

    fn deduct_balance(env: &Env, from: &Address, amount: i128) {
        let key = (symbol_short!("balance"), from.clone());
        let bal: i128 = env.storage().persistent().get(&key).expect("no balance");
        assert!(bal >= amount, "insufficient balance");
        env.storage().persistent().set(&key, &(bal - amount));
    }

    fn add_burned(env: &Env, amount: i128) {
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalBurned)
            .unwrap_or(0);
        let new_total = total
            .checked_add(amount)
            .unwrap_or_else(|| panic!("overflow: total_burned"));
        env.storage().instance().set(&DataKey::TotalBurned, &new_total);
    }

    fn spend_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
        let key = DataKey::Allowance(from.clone(), spender.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        assert!(current >= amount, "insufficient allowance");
        env.storage().persistent().set(&key, &(current - amount));
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, EnergyTokenClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(EnergyToken, ());
        let client = EnergyTokenClient::new(&env, &id);
        let admin = Address::generate(&env);
        let minter = Address::generate(&env);
        client.initialize(&admin, &minter);
        (env, client)
    }

    // ── existing tests (preserved) ───────────────────────────────────────────

    #[test]
    fn test_mint_burn_supply() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &1000_i128);
        assert_eq!(client.total_supply(), 1000_i128);
        client.burn(&user, &400_i128);
        assert_eq!(client.total_supply(), 600_i128);
        assert_eq!(client.balance(&user), 600_i128);
    }

    #[test]
    fn test_transfer() {
        let (env, client) = setup();
        let a = Address::generate(&env);
        let b = Address::generate(&env);
        client.mint(&a, &500_i128);
        client.transfer(&a, &b, &200_i128);
        assert_eq!(client.balance(&a), 300_i128);
        assert_eq!(client.balance(&b), 200_i128);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_burn_overdraft() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &10_i128);
        client.burn(&user, &100_i128);
    }

    #[test]
    fn test_mint_max_i128() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &i128::MAX);
        assert_eq!(client.balance(&user), i128::MAX);
        assert_eq!(client.total_supply(), i128::MAX);
    }

    #[test]
    #[should_panic(expected = "overflow: balance")]
    fn test_mint_overflow_panics() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &i128::MAX);
        client.mint(&user, &1_i128);
    }

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

    // ── SEP-41 compliance tests ──────────────────────────────────────────────

    #[test]
    fn test_sep41_metadata() {
        let (env, client) = setup();
        assert_eq!(client.name(), String::from_str(&env, "SolarProof kWh"));
        assert_eq!(client.symbol(), String::from_str(&env, "SKWH"));
        assert_eq!(client.decimals(), 7);
    }

    #[test]
    fn test_sep41_approve_and_allowance() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        assert_eq!(client.allowance(&owner, &spender), 0);
        client.approve(&owner, &spender, &500_i128);
        assert_eq!(client.allowance(&owner, &spender), 500_i128);
    }

    #[test]
    fn test_sep41_transfer_from() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &400_i128);
        client.transfer_from(&spender, &owner, &recipient, &300_i128);
        assert_eq!(client.balance(&owner), 700_i128);
        assert_eq!(client.balance(&recipient), 300_i128);
        // allowance reduced
        assert_eq!(client.allowance(&owner, &spender), 100_i128);
    }

    #[test]
    #[should_panic(expected = "insufficient allowance")]
    fn test_sep41_transfer_from_exceeds_allowance() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &100_i128);
        client.transfer_from(&spender, &owner, &recipient, &200_i128);
    }

    #[test]
    fn test_sep41_burn_from() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &600_i128);
        client.burn_from(&spender, &owner, &400_i128);
        assert_eq!(client.balance(&owner), 600_i128);
        assert_eq!(client.total_supply(), 600_i128);
        assert_eq!(client.allowance(&owner, &spender), 200_i128);
    }

    #[test]
    #[should_panic(expected = "insufficient allowance")]
    fn test_sep41_burn_from_exceeds_allowance() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &50_i128);
        client.burn_from(&spender, &owner, &100_i128);
    }

    #[test]
    fn test_sep41_approve_overwrite() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.approve(&owner, &spender, &500_i128);
        client.approve(&owner, &spender, &100_i128);
        assert_eq!(client.allowance(&owner, &spender), 100_i128);
    }

    #[test]
    fn test_sep41_approve_zero_revokes() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.approve(&owner, &spender, &500_i128);
        client.approve(&owner, &spender, &0_i128);
        assert_eq!(client.allowance(&owner, &spender), 0);
    }

    /// Cross-operator: spender A cannot spend from owner B without approval.
    #[test]
    #[should_panic(expected = "insufficient allowance")]
    fn test_sep41_no_allowance_cross_operator() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        // no approve call
        client.transfer_from(&spender, &owner, &recipient, &100_i128);
    }
}
