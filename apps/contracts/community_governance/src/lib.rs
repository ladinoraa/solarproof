//! # Community Governance — cooperative proposals + voting.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String};

/// Default quorum: 10% in basis points
const DEFAULT_QUORUM_BPS: u32 = 1_000;
/// Default approval threshold: 51% in basis points
const DEFAULT_THRESHOLD_BPS: u32 = 5_100;

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ProposalStatus { Active, Passed, Rejected, Expired }

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub end_ledger: u32,
    pub status: ProposalStatus,
}

#[contracttype]
pub enum DataKey { Admin, ProposalCount, Proposals, QuorumBps, ThresholdBps, VotingPeriod }

#[contract]
pub struct CommunityGovernance;

#[contractimpl]
impl CommunityGovernance {
    pub fn initialize(env: Env, admin: Address, voting_period_ledgers: u32) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::QuorumBps, &DEFAULT_QUORUM_BPS);
        env.storage().instance().set(&DataKey::ThresholdBps, &DEFAULT_THRESHOLD_BPS);
        env.storage().instance().set(&DataKey::VotingPeriod, &voting_period_ledgers);
        env.storage().instance().set(&DataKey::ProposalCount, &0_u32);
        let proposals: Map<u32, Proposal> = Map::new(&env);
        env.storage().instance().set(&DataKey::Proposals, &proposals);
    }

    /// Update quorum_bps via governance — must be called through a passed proposal (admin auth).
    pub fn set_quorum_bps(env: Env, new_quorum_bps: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        assert!(new_quorum_bps > 0 && new_quorum_bps <= 10_000, "quorum_bps must be 1-10000");
        env.storage().instance().set(&DataKey::QuorumBps, &new_quorum_bps);
        env.events().publish((symbol_short!("qrm_upd"),), new_quorum_bps);
    }

    /// Update threshold_bps via governance — must be called through a passed proposal (admin auth).
    pub fn set_threshold_bps(env: Env, new_threshold_bps: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        assert!(new_threshold_bps > 0 && new_threshold_bps <= 10_000, "threshold_bps must be 1-10000");
        env.storage().instance().set(&DataKey::ThresholdBps, &new_threshold_bps);
        env.events().publish((symbol_short!("thr_upd"),), new_threshold_bps);
    }

    pub fn get_quorum_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::QuorumBps).unwrap_or(DEFAULT_QUORUM_BPS)
    }

    pub fn get_threshold_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ThresholdBps).unwrap_or(DEFAULT_THRESHOLD_BPS)
    }

    pub fn propose(env: Env, proposer: Address, title: String, description: String) -> u32 {
        proposer.require_auth();
        let mut count: u32 = env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0);
        count += 1;
        let period: u32 = env.storage().instance().get(&DataKey::VotingPeriod).expect("not initialized");
        let proposal = Proposal {
            id: count, proposer, title, description,
            yes_votes: 0, no_votes: 0,
            end_ledger: env.ledger().sequence() + period,
            status: ProposalStatus::Active,
        };
        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&DataKey::Proposals).expect("not initialized");
        proposals.set(count, proposal);
        env.storage().instance().set(&DataKey::ProposalCount, &count);
        env.storage().instance().set(&DataKey::Proposals, &proposals);
        count
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u32, approve: bool) {
        voter.require_auth();
        let voted_key = (symbol_short!("voted"), proposal_id, voter.clone());
        if env.storage().persistent().get::<_, bool>(&voted_key).unwrap_or(false) {
            panic!("already voted");
        }
        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&DataKey::Proposals).expect("not initialized");
        let mut p = proposals.get(proposal_id).expect("proposal not found");
        assert!(p.status == ProposalStatus::Active, "proposal not active");
        assert!(env.ledger().sequence() <= p.end_ledger, "voting period ended");
        if approve { p.yes_votes += 1; } else { p.no_votes += 1; }
        proposals.set(proposal_id, p);
        env.storage().instance().set(&DataKey::Proposals, &proposals);
        env.storage().persistent().set(&voted_key, &true);
    }

    pub fn finalize(env: Env, proposal_id: u32) {
        let mut proposals: Map<u32, Proposal> = env.storage().instance().get(&DataKey::Proposals).expect("not initialized");
        let mut p = proposals.get(proposal_id).expect("proposal not found");
        assert!(p.status == ProposalStatus::Active, "already finalized");
        assert!(env.ledger().sequence() > p.end_ledger, "voting still open");

        let quorum_bps: u32 = env.storage().instance().get(&DataKey::QuorumBps).unwrap_or(DEFAULT_QUORUM_BPS);
        let threshold_bps: u32 = env.storage().instance().get(&DataKey::ThresholdBps).unwrap_or(DEFAULT_THRESHOLD_BPS);
        let total = p.yes_votes + p.no_votes;

        // quorum check: total votes * 10000 >= quorum_bps * total_possible
        // Simplified: require at least 1 vote and yes_votes/total >= threshold_bps/10000
        p.status = if total == 0 {
            ProposalStatus::Expired
        } else if p.yes_votes * 10_000 / total >= threshold_bps && total * 10_000 >= quorum_bps {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };

        proposals.set(proposal_id, p.clone());
        env.storage().instance().set(&DataKey::Proposals, &proposals);
        env.events().publish((symbol_short!("final"),), (proposal_id, p.status));
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Option<Proposal> {
        let proposals: Map<u32, Proposal> = env.storage().instance().get(&DataKey::Proposals).expect("not initialized");
        proposals.get(proposal_id)
    }

    pub fn proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup() -> (Env, Address, CommunityGovernanceClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(CommunityGovernance, ());
        let client = CommunityGovernanceClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &100_u32);
        (env, admin, client)
    }

    #[test]
    fn test_defaults() {
        let (_env, _admin, client) = setup();
        assert_eq!(client.get_quorum_bps(), 1_000);
        assert_eq!(client.get_threshold_bps(), 5_100);
    }

    #[test]
    fn test_set_quorum_bps() {
        let (_env, admin, client) = setup();
        client.set_quorum_bps(&admin, &2_000_u32);
        assert_eq!(client.get_quorum_bps(), 2_000);
    }

    #[test]
    fn test_set_threshold_bps() {
        let (_env, admin, client) = setup();
        client.set_threshold_bps(&admin, &6_000_u32);
        assert_eq!(client.get_threshold_bps(), 6_000);
    }

    #[test]
    #[should_panic(expected = "quorum_bps must be 1-10000")]
    fn test_quorum_bps_boundary_zero() {
        let (_env, admin, client) = setup();
        client.set_quorum_bps(&admin, &0_u32);
    }

    #[test]
    #[should_panic(expected = "quorum_bps must be 1-10000")]
    fn test_quorum_bps_boundary_over() {
        let (_env, admin, client) = setup();
        client.set_quorum_bps(&admin, &10_001_u32);
    }

    #[test]
    #[should_panic(expected = "threshold_bps must be 1-10000")]
    fn test_threshold_bps_boundary_zero() {
        let (_env, admin, client) = setup();
        client.set_threshold_bps(&admin, &0_u32);
    }

    #[test]
    #[should_panic(expected = "threshold_bps must be 1-10000")]
    fn test_threshold_bps_boundary_over() {
        let (_env, admin, client) = setup();
        client.set_threshold_bps(&admin, &10_001_u32);
    }

    #[test]
    fn test_propose_and_pass() {
        let (env, _admin, client) = setup();
        let proposer = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "Test"), &String::from_str(&env, "Desc"));
        client.vote(&Address::generate(&env), &id, &true);
        client.vote(&Address::generate(&env), &id, &true);
        env.ledger().with_mut(|l| l.sequence_number += 101);
        client.finalize(&id);
        assert_eq!(client.get_proposal(&id).unwrap().status, ProposalStatus::Passed);
    }
}
