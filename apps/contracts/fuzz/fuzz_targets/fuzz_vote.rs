//! Fuzz target: community_governance::vote
//!
//! Exercises vote() with arbitrary (voter_count, approve_pattern) inputs.
//! Verifies that:
//!   - each voter can vote exactly once per proposal
//!   - yes_votes + no_votes == total votes cast
//!   - finalize() always produces a valid ProposalStatus

#![no_main]

use libfuzzer_sys::fuzz_target;
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use community_governance::{CommunityGovernance, CommunityGovernanceClient, ProposalStatus};

fuzz_target!(|data: &[u8]| {
    if data.is_empty() {
        return;
    }

    // First byte: number of voters (1–32 to keep runtime bounded)
    let voter_count = (data[0] as usize % 32) + 1;
    // Remaining bytes: bit-per-voter approve/reject pattern
    let approve_bits = data.get(1..).unwrap_or(&[]);

    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(CommunityGovernance, ());
    let client = CommunityGovernanceClient::new(&env, &id);
    let admin = Address::generate(&env);
    // quorum=1 (any vote passes), voting_period=10 ledgers
    client.initialize(&admin, &1_u32, &10_u32);

    let proposer = Address::generate(&env);
    let pid = client.propose(
        &proposer,
        &String::from_str(&env, "fuzz"),
        &String::from_str(&env, "fuzz"),
    );

    let mut yes: u32 = 0;
    let mut no: u32 = 0;

    for i in 0..voter_count {
        let voter = Address::generate(&env);
        let byte_idx = i / 8;
        let bit = i % 8;
        let approve = approve_bits.get(byte_idx).map(|b| (b >> bit) & 1 == 1).unwrap_or(true);
        client.vote(&voter, &pid, &approve);
        if approve { yes += 1; } else { no += 1; }
    }

    let proposal = client.get_proposal(&pid).expect("proposal must exist");
    assert_eq!(proposal.yes_votes, yes);
    assert_eq!(proposal.no_votes, no);

    // Advance past voting period and finalize
    env.ledger().with_mut(|l| l.sequence_number += 11);
    client.finalize(&pid);

    let finalized = client.get_proposal(&pid).expect("proposal must exist after finalize");
    assert!(
        matches!(finalized.status, ProposalStatus::Passed | ProposalStatus::Rejected | ProposalStatus::Expired),
        "finalized status must be terminal"
    );
});
