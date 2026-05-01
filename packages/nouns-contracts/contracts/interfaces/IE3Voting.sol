// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IE3Voting {
    function castE3Vote(uint256 proposalId, bytes calldata encryptedVote, bytes32[] calldata merkleProof, uint96 votingPower) external;

    function setE3Tally(
        uint256 proposalId,
        uint96 forVotes,
        uint96 againstVotes,
        uint96 abstainVotes
    ) external;

    function isE3Proposal(uint256 proposalId) external view returns (bool);

    function initializeE3Vote(uint256 proposalId, bytes32 merkleRoot) external;
}
