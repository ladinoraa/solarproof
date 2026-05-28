//! # Energy Token
//!
//! SEP-41 fungible certificate token. 1 token = 1 kWh of verified
//! renewable energy. Minting requires a valid audit anchor to exist
//! in the `audit_registry` contract for the same reading hash.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    Minter,
    TotalMinted,
    TotalBurned,
}

#[contract]
pub struct EnergyToken;

#[contractimpl]
impl EnergyToken {
    pub fn initialize(env: Env, admin: Address, minter: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::TotalMinted, &0_i128);
        env.storage().instance().set(&DataKey::TotalBurned, &0_i128);
    }

    pub fn name(env: Env) -> String { String::from_str(&env, "SolarProof Energy Certificate") }
    pub fn symbol(env: Env) -> String { String::from_str(&env, "SPEC") }
    pub fn decimals(_env: Env) -> u32 { 7 }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).expect("not initialized");
        minter.require_auth();
        assert!(amount > 0, "amount must be positive");

        let key = (symbol_short!("balance"), to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(bal + amount));

        let total: i128 = env.storage().instance().get(&DataKey::TotalMinted).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalMinted, &(total + amount));

        env.events().publish((symbol_short!("mint"),), (to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");

        let key = (symbol_short!("balance"), from.clone());
        let bal: i128 = env.storage().persistent().get(&key).expect("no balance");
        assert!(bal >= amount, "insufficient balance");
        env.storage().persistent().set(&key, &(bal - amount));

        let total: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalBurned, &(total + amount));

        env.events().publish((symbol_short!("burn"),), (from, amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");

        let fk = (symbol_short!("balance"), from.clone());
        let fb: i128 = env.storage().persistent().get(&fk).expect("no balance");
        assert!(fb >= amount, "insufficient balance");

        let tk = (symbol_short!("balance"), to.clone());
        let tb: i128 = env.storage().persistent().get(&tk).unwrap_or(0);

        env.storage().persistent().set(&fk, &(fb - amount));
        env.storage().persistent().set(&tk, &(tb + amount));
        env.events().publish((symbol_short!("transfer"),), (from, to, amount));
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        assert!(amount > 0, "amount must be positive");

        // Deduct allowance
        let ak = (symbol_short!("allow"), from.clone(), spender.clone());
        let allowance: i128 = env.storage().temporary().get(&ak).unwrap_or(0);
        assert!(allowance >= amount, "insufficient allowance");
        env.storage().temporary().set(&ak, &(allowance - amount));

        let fk = (symbol_short!("balance"), from.clone());
        let fb: i128 = env.storage().persistent().get(&fk).expect("no balance");
        assert!(fb >= amount, "insufficient balance");

        let tk = (symbol_short!("balance"), to.clone());
        let tb: i128 = env.storage().persistent().get(&tk).unwrap_or(0);

        env.storage().persistent().set(&fk, &(fb - amount));
        env.storage().persistent().set(&tk, &(tb + amount));
        env.events().publish((symbol_short!("transfer"),), (from, to, amount));
    }

    /// SEP-41: approve spender to transfer up to `amount` from `from`.
    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        assert!(amount >= 0, "amount must be non-negative");
        let ak = (symbol_short!("allow"), from.clone(), spender.clone());
        if amount == 0 {
            env.storage().temporary().remove(&ak);
        } else {
            env.storage().temporary().set(&ak, &amount);
            env.storage().temporary().extend_ttl(&ak, expiration_ledger, expiration_ledger);
        }
        env.events().publish((symbol_short!("approve"),), (from, spender, amount, expiration_ledger));
    }

    /// SEP-41: returns the approved allowance for `spender` over `from`'s tokens.
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let ak = (symbol_short!("allow"), from, spender);
        env.storage().temporary().get(&ak).unwrap_or(0)
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&(symbol_short!("balance"), account)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        let minted: i128 = env.storage().instance().get(&DataKey::TotalMinted).unwrap_or(0);
        let burned: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        minted - burned
    }

    pub fn set_minter(env: Env, new_minter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Minter, &new_minter);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }
}

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
    fn test_metadata() {
        let (env, client) = setup();
        assert_eq!(client.symbol(), String::from_str(&env, "SPEC"));
        assert_eq!(client.decimals(), 7);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_burn_overdraft() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &10_i128);
        client.burn(&user, &100_i128);
    }

    // SEP-41 compliance tests
    #[test]
    fn test_approve_and_allowance() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.approve(&owner, &spender, &500_i128, &1000_u32);
        assert_eq!(client.allowance(&owner, &spender), 500_i128);
    }

    #[test]
    fn test_transfer_from() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &300_i128, &1000_u32);
        client.transfer_from(&spender, &owner, &recipient, &200_i128);
        assert_eq!(client.balance(&owner), 800_i128);
        assert_eq!(client.balance(&recipient), 200_i128);
        assert_eq!(client.allowance(&owner, &spender), 100_i128);
    }

    #[test]
    #[should_panic(expected = "insufficient allowance")]
    fn test_transfer_from_exceeds_allowance() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.mint(&owner, &1000_i128);
        client.approve(&owner, &spender, &100_i128, &1000_u32);
        client.transfer_from(&spender, &owner, &recipient, &200_i128);
    }

    #[test]
    fn test_approve_zero_revokes() {
        let (env, client) = setup();
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        client.approve(&owner, &spender, &500_i128, &1000_u32);
        client.approve(&owner, &spender, &0_i128, &0_u32);
        assert_eq!(client.allowance(&owner, &spender), 0_i128);
    }

    #[test]
    fn test_sep41_name_symbol_decimals() {
        let (env, client) = setup();
        assert_eq!(client.name(), String::from_str(&env, "SolarProof Energy Certificate"));
        assert_eq!(client.symbol(), String::from_str(&env, "SPEC"));
        assert_eq!(client.decimals(), 7_u32);
    }
}
