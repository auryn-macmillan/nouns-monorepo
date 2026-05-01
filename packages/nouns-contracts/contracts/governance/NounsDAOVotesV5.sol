// SPDX-License-Identifier: GPL-3.0

/// @title Library for Nouns DAO Logic containing E3 voting related code

/*********************************
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░██░░░████░░██░░░████░░░ *
 * ░░██████░░░████████░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 *********************************/

pragma solidity ^0.8.19;

import { NounsDAOTypes } from './NounsDAOInterfaces.sol';
import { NounsDAOVotes } from './NounsDAOVotes.sol';
import { NounsDAOProposals } from './NounsDAOProposals.sol';

interface ICrispVotingSidecarInitializer {
    function initializeE3Vote(uint256 proposalId, bytes32 merkleRoot) external;
}

interface ICrispVotingSidecar {
    function isE3Proposal(uint256 proposalId) external view returns (bool);
}

library NounsDAOVotesV5 {
    using NounsDAOProposals for NounsDAOTypes.Storage;

    error AdminOnly();
    error CrispVotingSidecarNotSet();
    error CastE3VoteInvalidProposalId();
    error CastE3VoteProposalIsNotE3();
    error CastE3VoteVotingIsClosed();
    error CastE3VoteAlreadyVoted();
    error CastE3VoteNoVotes();
    error SetE3TallyNotSidecar();
    error SetE3TallyInvalidProposalId();
    error SetE3TallyProposalIsNotE3();
    error SetE3TallyVotingIsActive();
    error UseCastE3Vote();

    /// @notice An event emitted when a vote has been cast on a proposal
    /// @param voter The address which casted a vote
    /// @param proposalId The proposal id which was voted on
    /// @param support Support value for the vote. 0=against, 1=for, 2=abstain
    /// @param votes Number of votes which were cast by the voter
    /// @param reason The reason given for the vote by the voter
    event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 votes, string reason);

    /// @notice Emitted when encrypted vote tallies are written for a proposal
    event E3TallySet(uint256 indexed proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes);

    event CrispVotingSidecarSet(address indexed oldSidecar, address indexed newSidecar);

    function proposeE3(
        NounsDAOTypes.Storage storage ds,
        NounsDAOProposals.ProposalTxs memory proposalTxs,
        string memory description,
        bytes32 merkleRoot
    ) public returns (uint256 proposalId) {
        if (ds.crispVotingSidecar == address(0)) revert CrispVotingSidecarNotSet();

        proposalId = ds.propose(proposalTxs, description, 0);

        ICrispVotingSidecarInitializer(ds.crispVotingSidecar).initializeE3Vote(proposalId, merkleRoot);
    }

    function castVoteChecked(NounsDAOTypes.Storage storage ds, uint256 proposalId, uint8 support) public {
        if (isE3VoteProposal(ds, proposalId)) revert UseCastE3Vote();
        NounsDAOVotes.castVote(ds, proposalId, support);
    }

    function castRefundableVoteChecked(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId,
        uint8 support,
        uint32 clientId
    ) public {
        if (isE3VoteProposal(ds, proposalId)) revert UseCastE3Vote();
        NounsDAOVotes.castRefundableVote(ds, proposalId, support, clientId);
    }

    function castRefundableVoteWithReasonChecked(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId,
        uint8 support,
        string calldata reason,
        uint32 clientId
    ) public {
        if (isE3VoteProposal(ds, proposalId)) revert UseCastE3Vote();
        NounsDAOVotes.castRefundableVoteWithReason(ds, proposalId, support, reason, clientId);
    }

    function castVoteWithReasonChecked(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) public {
        if (isE3VoteProposal(ds, proposalId)) revert UseCastE3Vote();
        NounsDAOVotes.castVoteWithReason(ds, proposalId, support, reason);
    }

    function castE3Vote(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId,
        address voter
    ) public returns (uint96 votes) {
        if (!_isExistingProposal(ds, proposalId)) revert CastE3VoteInvalidProposalId();
        if (!isE3VoteProposal(ds, proposalId)) revert CastE3VoteProposalIsNotE3();

        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        if (block.number <= proposal.startBlock || block.number > proposal.endBlock) revert CastE3VoteVotingIsClosed();
        if (proposal.receipts[voter].hasVoted) revert CastE3VoteAlreadyVoted();

        votes = uint96(ds.nouns.getPriorVotes(voter, proposal.startBlock));
        if (votes == 0) revert CastE3VoteNoVotes();

        proposal.receipts[voter] = NounsDAOTypes.Receipt({
            hasVoted: true,
            support: 0,
            votes: votes,
            isE3Vote: true
        });

        emit VoteCast(voter, proposalId, 0, votes, '');
    }

    function setE3Tally(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId,
        uint96 forVotes,
        uint96 againstVotes,
        uint96 abstainVotes
    ) public {
        if (msg.sender != ds.crispVotingSidecar) revert SetE3TallyNotSidecar();
        if (!_isExistingProposal(ds, proposalId)) revert SetE3TallyInvalidProposalId();
        if (!isE3VoteProposal(ds, proposalId)) revert SetE3TallyProposalIsNotE3();

        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        if (block.number <= proposal.endBlock) revert SetE3TallyVotingIsActive();
        proposal.forVotes = forVotes;
        proposal.againstVotes = againstVotes;
        proposal.abstainVotes = abstainVotes;

        emit E3TallySet(proposalId, forVotes, againstVotes, abstainVotes);
    }

    function setCrispVotingSidecar(NounsDAOTypes.Storage storage ds, address sidecar) public {
        if (msg.sender != ds.admin) revert AdminOnly();

        address oldSidecar = ds.crispVotingSidecar;
        ds.crispVotingSidecar = sidecar;

        emit CrispVotingSidecarSet(oldSidecar, sidecar);
    }

    function isE3VoteProposal(
        NounsDAOTypes.Storage storage ds,
        uint256 proposalId
    ) public view returns (bool) {
        return
            ds.crispVotingSidecar != address(0) &&
            ICrispVotingSidecar(ds.crispVotingSidecar).isE3Proposal(proposalId);
    }

    function _isExistingProposal(NounsDAOTypes.Storage storage ds, uint256 proposalId) private view returns (bool) {
        return proposalId != 0 && proposalId <= ds.proposalCount;
    }
}
