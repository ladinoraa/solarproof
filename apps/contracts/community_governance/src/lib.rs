//! # Community Governance — cooperative proposals + voting.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String};

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
pub enum DataKey { Admin, ProposalCount, Proposals, Quorum, VotingPeriod }

#[contract]
pub struct CommunityGovernance;

#[contractimpl]
impl CommunityGovernance {
    pub fn initialize(env: Env, admin: Address, quorum: u32, voting_period_ledgers: u32) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        assert!(quorum > 0 && quorum <= 100, "quorum must be 1-100");
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Quorum, &quorum);
        env.storage().instance().set(&DataKey::VotingPeriod, &voting_period_ledgers);
        env.storage().instance().set(&DataKey::ProposalCount, &0_u32);
        let proposals: Map<u32, Proposal> = Map::new(&env);
        env.storage().instance().set(&DataKey::Proposals, &proposals);
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
        let quorum: u32 = env.storage().instance().get(&DataKey::Quorum).expect("not initialized");
        let total = p.yes_votes + p.no_votes;
        p.status = if total == 0 { ProposalStatus::Expired }
            else if p.yes_votes * 100 / total >= quorum { ProposalStatus::Passed }
            else { ProposalStatus::Rejected };
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

    fn setup() -> (Env, CommunityGovernanceClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(CommunityGovernance, ());
        let client = CommunityGovernanceClient::new(&env, &id);
        client.initialize(&Address::generate(&env), &51_u32, &100_u32);
        (env, client)
    }

    #[test]
    fn test_propose_and_pass() {
        let (env, client) = setup();
        let proposer = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "Test"), &String::from_str(&env, "Desc"));
        client.vote(&Address::generate(&env), &id, &true);
        client.vote(&Address::generate(&env), &id, &true);
        env.ledger().with_mut(|l| l.sequence_number += 101);
        client.finalize(&id);
        assert_eq!(client.get_proposal(&id).unwrap().status, ProposalStatus::Passed);
    }
}
