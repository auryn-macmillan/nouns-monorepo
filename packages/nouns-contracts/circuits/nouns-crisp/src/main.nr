use dep::std;

fn compute_merkle_root(leaf: Field, merkle_path: [Field; 20], merkle_indices: [u1; 20]) -> Field {
    let mut current_hash = leaf;

    for i in 0..20 {
        let path_element = merkle_path[i];
        let is_right = merkle_indices[i] == 1;
        
        if is_right {
            current_hash = std::hash::pedersen_hash([path_element, current_hash]);
        } else {
            current_hash = std::hash::pedersen_hash([current_hash, path_element]);
        }
    }
    
    current_hash
}

fn main(
    merkle_root: pub Field,
    proposal_id: pub Field,
    commitment: pub Field,
    voter_address: Field,
    voting_power: u64,
    merkle_path: [Field; 20],
    merkle_indices: [u1; 20],
    vote_choice: u8,
    nonce: Field,
) {
    // 1. Verify vote_choice is valid (0, 1, or 2)
    assert(vote_choice < 3);
    
    // 2. Compute Merkle leaf: keccak256(voter_address, voting_power)
    let leaf = std::hash::keccak256([voter_address, voting_power as Field], 2);
    
    // 3. Verify Merkle proof
    // Note: If keccak256 returns an array, it may need conversion. Assuming it returns a Field in this older version as per prompt pseudo-code.
    let computed_root = compute_merkle_root(leaf, merkle_path, merkle_indices);
    assert(computed_root == merkle_root);
    
    // 4. Verify commitment: commitment == hash(voter_address, voting_power, nonce, proposal_id)
    let expected_commitment = std::hash::pedersen_hash([voter_address, voting_power as Field, nonce, proposal_id]);
    assert(expected_commitment == commitment);
}

#[test]
fn test_valid_vote() {
    let voter_address = 123;
    let voting_power = 5;
    let leaf = std::hash::keccak256([voter_address, voting_power as Field], 2);
    
    let merkle_path = [0; 20];
    let merkle_indices = [0; 20];
    
    let mut computed_root = leaf;
    for i in 0..20 {
        computed_root = std::hash::pedersen_hash([computed_root, merkle_path[i]]);
    }
    let merkle_root = computed_root;
    
    let proposal_id = 42;
    let nonce = 999;
    let commitment = std::hash::pedersen_hash([voter_address, voting_power as Field, nonce, proposal_id]);
    let vote_choice = 1;
    
    main(
        merkle_root,
        proposal_id,
        commitment,
        voter_address,
        voting_power,
        merkle_path,
        merkle_indices,
        vote_choice,
        nonce
    );
}
