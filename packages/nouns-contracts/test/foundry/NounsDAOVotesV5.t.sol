// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import 'forge-std/Test.sol';
import { NounsDAOStorage, NounsDAOTypes, NounsTokenLike } from '../../contracts/governance/NounsDAOInterfaces.sol';
import { NounsDAOVotesV5, ICrispVotingSidecar } from '../../contracts/governance/NounsDAOVotesV5.sol';

contract MockNounsTokenLike {
    mapping(address => mapping(uint256 => uint96)) internal priorVotes;

    function setPriorVotes(address account, uint256 blockNumber, uint96 votes) external {
        priorVotes[account][blockNumber] = votes;
    }

    function getPriorVotes(address account, uint256 blockNumber) external view returns (uint96) {
        return priorVotes[account][blockNumber];
    }
}

contract MockCrispVotingSidecar is ICrispVotingSidecar {
    mapping(uint256 => bool) internal e3Proposals;

    function setIsE3Proposal(uint256 proposalId, bool isE3) external {
        e3Proposals[proposalId] = isE3;
    }

    function isE3Proposal(uint256 proposalId) external view returns (bool) {
        return e3Proposals[proposalId];
    }
}

contract NounsDAOVotesV5Harness is NounsDAOStorage {
    using NounsDAOVotesV5 for NounsDAOTypes.Storage;

    error ProposalIdTooLarge();

    function setNouns(address nouns) external {
        ds.nouns = NounsTokenLike(nouns);
    }

    function setCrispVotingSidecar(address sidecar) external {
        ds.crispVotingSidecar = sidecar;
    }

    function setProposal(
        uint256 proposalId,
        uint256 startBlock,
        uint256 endBlock,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) external {
        if (proposalId > type(uint32).max) revert ProposalIdTooLarge();
        // forge-lint: disable-next-line(unsafe-typecast)

        if (proposalId > ds.proposalCount) {
            ds.proposalCount = proposalId;
        }

        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        proposal.id = uint32(proposalId);
        proposal.startBlock = startBlock;
        proposal.endBlock = endBlock;
        proposal.forVotes = forVotes;
        proposal.againstVotes = againstVotes;
        proposal.abstainVotes = abstainVotes;
    }

    function castE3Vote(uint256 proposalId, address voter) external returns (uint96 votes) {
        return ds.castE3Vote(proposalId, voter);
    }

    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external {
        ds.setE3Tally(proposalId, forVotes, againstVotes, abstainVotes);
    }

    function isE3VoteProposal(uint256 proposalId) external view returns (bool) {
        return ds.isE3VoteProposal(proposalId);
    }

    function getReceipt(uint256 proposalId, address voter) external view returns (NounsDAOTypes.Receipt memory) {
        return ds._proposals[proposalId].receipts[voter];
    }

    function getProposalVotes(uint256 proposalId) external view returns (uint256, uint256, uint256) {
        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
    }
}

contract NounsDAOVotesV5Test is Test {
    NounsDAOVotesV5Harness internal harness;
    MockNounsTokenLike internal nouns;
    MockCrispVotingSidecar internal sidecar;

    address internal voter = makeAddr('voter');
    address internal nonSidecar = makeAddr('nonSidecar');
    uint256 internal constant PROPOSAL_ID = 1;
    uint96 internal constant VOTER_VOTES = 7;
    uint256 internal proposalStartBlock;

    function setUp() public {
        harness = new NounsDAOVotesV5Harness();
        nouns = new MockNounsTokenLike();
        sidecar = new MockCrispVotingSidecar();

        harness.setNouns(address(nouns));
        harness.setCrispVotingSidecar(address(sidecar));

        proposalStartBlock = block.number - 1;
        harness.setProposal(PROPOSAL_ID, proposalStartBlock, block.number + 10, 11, 13, 17);
        nouns.setPriorVotes(voter, proposalStartBlock, VOTER_VOTES);
        sidecar.setIsE3Proposal(PROPOSAL_ID, true);
    }

    function testCastE3VoteMarksReceipt() public {
        uint96 votes = harness.castE3Vote(PROPOSAL_ID, voter);

        NounsDAOTypes.Receipt memory receipt = harness.getReceipt(PROPOSAL_ID, voter);
        (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) = harness.getProposalVotes(PROPOSAL_ID);

        assertEq(votes, VOTER_VOTES);
        assertTrue(receipt.hasVoted);
        assertEq(receipt.support, 0);
        assertEq(receipt.votes, VOTER_VOTES);
        assertTrue(receipt.isE3Vote);
        assertEq(forVotes, 11);
        assertEq(againstVotes, 13);
        assertEq(abstainVotes, 17);
    }

    function testCastE3VotePreventDoubleVote() public {
        harness.castE3Vote(PROPOSAL_ID, voter);

        vm.expectRevert(bytes('NounsDAO::castE3Vote: voter already voted'));
        harness.castE3Vote(PROPOSAL_ID, voter);
    }

    function testSetE3TallyWritesVotes() public {
        vm.roll(block.number + 11);

        vm.prank(address(sidecar));
        harness.setE3Tally(PROPOSAL_ID, 21, 22, 23);

        (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) = harness.getProposalVotes(PROPOSAL_ID);

        assertEq(forVotes, 21);
        assertEq(againstVotes, 22);
        assertEq(abstainVotes, 23);
    }

    function testSetE3TallyAccessControl() public {
        vm.expectRevert(bytes('NounsDAO::setE3Tally: not sidecar'));
        vm.prank(nonSidecar);
        harness.setE3Tally(PROPOSAL_ID, 21, 22, 23);
    }

    function testIsE3VoteProposal() public {
        assertTrue(harness.isE3VoteProposal(PROPOSAL_ID));
    }

    function testCastE3VoteRejectsNonE3Proposal() public {
        sidecar.setIsE3Proposal(PROPOSAL_ID, false);

        vm.expectRevert(bytes('NounsDAO::castE3Vote: proposal is not E3'));
        harness.castE3Vote(PROPOSAL_ID, voter);
    }

    function testCastE3VoteRejectsZeroVotes() public {
        address zeroVotesVoter = makeAddr('zeroVotesVoter');
        nouns.setPriorVotes(zeroVotesVoter, proposalStartBlock, 0);

        vm.expectRevert(bytes('NounsDAO::castE3Vote: no votes'));
        harness.castE3Vote(PROPOSAL_ID, zeroVotesVoter);
    }

    function testCastE3VoteRejectsClosedVotingWindow() public {
        harness.setProposal(PROPOSAL_ID, block.number + 5, block.number + 10, 11, 13, 17);
        nouns.setPriorVotes(voter, block.number + 5, VOTER_VOTES);

        vm.expectRevert(bytes('NounsDAO::castE3Vote: voting is closed'));
        harness.castE3Vote(PROPOSAL_ID, voter);
    }

    function testSetE3TallyRejectsNonE3Proposal() public {
        sidecar.setIsE3Proposal(PROPOSAL_ID, false);
        vm.roll(block.number + 11);

        vm.expectRevert(bytes('NounsDAO::setE3Tally: proposal is not E3'));
        vm.prank(address(sidecar));
        harness.setE3Tally(PROPOSAL_ID, 21, 22, 23);
    }

    function testSetE3TallyRejectsActiveVotingWindow() public {
        vm.expectRevert(bytes('NounsDAO::setE3Tally: voting is active'));
        vm.prank(address(sidecar));
        harness.setE3Tally(PROPOSAL_ID, 21, 22, 23);
    }
}
