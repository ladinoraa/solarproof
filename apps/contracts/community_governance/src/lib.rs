//! # Community Governance (`community-governance`)
//!
//! On-chain cooperative governance: members submit proposals and vote.
//! A proposal passes when `yes_votes / total_votes >= quorum` after the
//! voting period ends.
//!
//! ## Roles
//! | Role | Description |
//! |------|-------------|
//! | `admin` | Set at initialisation; reserved for future upgrades. |
//! | Any address | Can propose and vote (no token-gating in current version). |
//!
//! ## Proposal lifecycle
//! ```
//! propose() → Active → [voting period] → finalize() → Passed | Rejected | Expired
//! ```
//!
//! ## Invariants
//! 1. Each address can vote at most once per proposal.
//! 2. Votes are only accepted while `ledger.sequence <= proposal.end_ledger`.
//! 3. `finalize()` can only be called after the voting period ends.
//! 4. A finalized proposal's status is immutable.
//! 5. `quorum` is in the range `[1, 100]` (percentage).
//!
//! ## Known limitations / out-of-scope
//! - No token-weighted voting (1 address = 1 vote; Sybil-vulnerable).
//! - No proposal execution payload (governance is advisory only).
//! - All proposals stored in a single instance-storage `Map`; may hit size
//!   limits at very high proposal counts.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// The lifecycle state of a proposal.
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ProposalStatus {
    /// Voting is open.
    Active,
    /// Voting closed; quorum reached with majority yes.
    Passed,
    /// Voting closed; quorum not reached or majority no.
    Rejected,
    /// Voting closed; no votes cast.
    Expired,
}

/// A governance proposal.
#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    /// Auto-incrementing proposal identifier (1-based).
    pub id: u32,
    /// Address that submitted the proposal.
    pub proposer: Address,
    /// Short human-readable title.
    pub title: String,
    /// Full description of the proposal.
    pub description: String,
    /// Number of yes votes cast.
    pub yes_votes: u32,
    /// Number of no votes cast.
    pub no_votes: u32,
    /// Ledger sequence at which voting closes (inclusive).
    pub end_ledger: u32,
    /// Current lifecycle status.
    pub status: ProposalStatus,
}

/// Enumeration of all instance-storage keys used by this contract.
#[contracttype]
pub enum DataKey {
    /// `Address` — the contract administrator.
    Admin,
    /// `u32` — total proposals created (also the ID of the latest proposal).
    ProposalCount,
    /// `Map<u32, Proposal>` — all proposals keyed by ID.
    Proposals,
    /// `u32` — minimum yes-vote percentage (1–100) required to pass.
    Quorum,
    /// `u32` — number of ledgers a proposal remains open for voting.
    VotingPeriod,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// Cooperative governance contract.
#[contract]
pub struct CommunityGovernance;

#[contractimpl]
impl CommunityGovernance {
    /// Initialise the contract.
    ///
    /// # Arguments
    /// * `admin`                 — administrator address.
    /// * `quorum`                — minimum yes-vote percentage to pass (1–100).
    /// * `voting_period_ledgers` — number of ledgers each proposal stays open.
    ///
    /// # Panics
    /// * `"already initialized"` if called more than once.
    /// * `"quorum must be 1-100"` if `quorum` is out of range.
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

    /// Submit a new proposal.
    ///
    /// # Arguments
    /// * `proposer`    — address submitting the proposal (must authorise).
    /// * `title`       — short title.
    /// * `description` — full description.
    ///
    /// # Authorization
    /// Requires `proposer` authorisation.
    ///
    /// # Returns
    /// The new proposal's ID.
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

    /// Cast a vote on an active proposal.
    ///
    /// # Arguments
    /// * `voter`       — address casting the vote (must authorise).
    /// * `proposal_id` — ID of the proposal to vote on.
    /// * `approve`     — `true` for yes, `false` for no.
    ///
    /// # Authorization
    /// Requires `voter` authorisation.
    ///
    /// # Panics
    /// * `"already voted"` if `voter` has already voted on this proposal.
    /// * `"proposal not found"` if `proposal_id` does not exist.
    /// * `"proposal not active"` if the proposal is not in `Active` status.
    /// * `"voting period ended"` if the current ledger exceeds `end_ledger`.
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

    /// Finalise a proposal after its voting period has ended.
    ///
    /// Outcome: `yes_votes * 100 / total >= quorum` → Passed, else Rejected.
    /// If no votes were cast → Expired.
    ///
    /// # Panics
    /// * `"proposal not found"` if `proposal_id` does not exist.
    /// * `"already finalized"` if the proposal is not in `Active` status.
    /// * `"voting still open"` if the current ledger has not passed `end_ledger`.
    ///
    /// # Events
    /// Emits `(topic: "final", data: (proposal_id, status))`.
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

    /// Returns the proposal with the given ID, or `None` if it does not exist.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Option<Proposal> {
        let proposals: Map<u32, Proposal> = env.storage().instance().get(&DataKey::Proposals).expect("not initialized");
        proposals.get(proposal_id)
    }

    /// Returns the total number of proposals created.
    pub fn proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

    #[test]
    fn test_propose_and_reject() {
        let (env, client) = setup();
        let proposer = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "Fail"), &String::from_str(&env, "Desc"));
        client.vote(&Address::generate(&env), &id, &false);
        client.vote(&Address::generate(&env), &id, &false);
        env.ledger().with_mut(|l| l.sequence_number += 101);
        client.finalize(&id);
        assert_eq!(client.get_proposal(&id).unwrap().status, ProposalStatus::Rejected);
    }

    #[test]
    fn test_propose_and_expire() {
        let (env, client) = setup();
        let proposer = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "Empty"), &String::from_str(&env, "Desc"));
        env.ledger().with_mut(|l| l.sequence_number += 101);
        client.finalize(&id);
        assert_eq!(client.get_proposal(&id).unwrap().status, ProposalStatus::Expired);
    }

    #[test]
    #[should_panic(expected = "already voted")]
    fn test_double_vote_rejected() {
        let (env, client) = setup();
        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "T"), &String::from_str(&env, "D"));
        client.vote(&voter, &id, &true);
        client.vote(&voter, &id, &true);
    }

    #[test]
    #[should_panic(expected = "voting still open")]
    fn test_finalize_before_period_ends_rejected() {
        let (env, client) = setup();
        let proposer = Address::generate(&env);
        let id = client.propose(&proposer, &String::from_str(&env, "T"), &String::from_str(&env, "D"));
        client.finalize(&id);
    }
}
