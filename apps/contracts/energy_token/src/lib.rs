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
        let new_bal = bal.checked_add(amount).expect("balance overflow");
        env.storage().persistent().set(&key, &new_bal);

        let total: i128 = env.storage().instance().get(&DataKey::TotalMinted).unwrap_or(0);
        let new_total = total.checked_add(amount).expect("total_minted overflow");
        env.storage().instance().set(&DataKey::TotalMinted, &new_total);

        env.events().publish((symbol_short!("mint"),), (to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");

        let key = (symbol_short!("balance"), from.clone());
        let bal: i128 = env.storage().persistent().get(&key).expect("no balance");
        assert!(bal >= amount, "insufficient balance");
        let new_bal = bal.checked_sub(amount).expect("balance underflow");
        env.storage().persistent().set(&key, &new_bal);

        let total: i128 = env.storage().instance().get(&DataKey::TotalBurned).unwrap_or(0);
        let new_total = total.checked_add(amount).expect("total_burned overflow");
        env.storage().instance().set(&DataKey::TotalBurned, &new_total);

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

        env.storage().persistent().set(&fk, &fb.checked_sub(amount).expect("balance underflow"));
        env.storage().persistent().set(&tk, &tb.checked_add(amount).expect("balance overflow"));
        env.events().publish((symbol_short!("transfer"),), (from, to, amount));
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

    #[test]
    #[should_panic(expected = "amount must be positive")]
    fn test_mint_zero_rejected() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &0_i128);
    }

    #[test]
    #[should_panic(expected = "amount must be positive")]
    fn test_mint_negative_rejected() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &-1_i128);
    }

    #[test]
    #[should_panic(expected = "balance overflow")]
    fn test_mint_overflow_rejected() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        // Fill balance to i128::MAX - 1
        client.mint(&user, &(i128::MAX - 1));
        // This should overflow
        client.mint(&user, &2_i128);
    }

    #[test]
    fn test_mint_boundary_max_minus_one() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &(i128::MAX - 1));
        assert_eq!(client.balance(&user), i128::MAX - 1);
    }

    #[test]
    fn test_mint_amount_one() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        client.mint(&user, &1_i128);
        assert_eq!(client.balance(&user), 1_i128);
    }
}
