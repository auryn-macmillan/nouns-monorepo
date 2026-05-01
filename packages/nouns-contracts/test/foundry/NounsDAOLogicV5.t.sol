// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import 'forge-std/Test.sol';
import {
    NounsDAOLogicV5
} from '../../contracts/governance/NounsDAOLogicV5.sol';
import { NounsDAOVotesV5 } from '../../contracts/governance/NounsDAOVotesV5.sol';
import {
    NounsDAOStorage,
    NounsDAOTypes,
    NounsTokenLike,
    INounsDAOForkEscrow,
    INounsDAOExecutorV2
} from '../../contracts/governance/NounsDAOInterfaces.sol';

contract MockNounsTokenLikeV5 {
    mapping(address => mapping(uint256 => uint96)) internal priorVotes;
    mapping(address => uint256) internal balances;
    uint256 internal _totalSupply;

    function setPriorVotes(address account, uint256 blockNumber, uint96 votes) external {
        priorVotes[account][blockNumber] = votes;
    }

    function setTotalSupply(uint256 totalSupply_) external {
        _totalSupply = totalSupply_;
    }

    function setBalanceOf(address account, uint256 balance) external {
        balances[account] = balance;
    }

    function getPriorVotes(address account, uint256 blockNumber) external view returns (uint96) {
        return priorVotes[account][blockNumber];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function transferFrom(address, address, uint256) external pure {}

    function safeTransferFrom(address, address, uint256) external pure {}

    function balanceOf(address owner) external view returns (uint256 balance) {
        return balances[owner];
    }

    function ownerOf(uint256) external pure returns (address owner) {
        return address(0);
    }

    function minter() external pure returns (address) {
        return address(0);
    }

    function mint() external pure returns (uint256) {
        return 0;
    }

    function setApprovalForAll(address, bool) external pure {}
}

contract MockForkEscrowV5 is INounsDAOForkEscrow {
    uint256 internal _numTokensOwnedByDAO;

    function setNumTokensOwnedByDAO(uint256 numTokens) external {
        _numTokensOwnedByDAO = numTokens;
    }

    function markOwner(address, uint256[] calldata) external pure {}

    function returnTokensToOwner(address, uint256[] calldata) external pure {}

    function closeEscrow() external pure returns (uint32) {
        return 0;
    }

    function numTokensInEscrow() external pure returns (uint256) {
        return 0;
    }

    function numTokensOwnedByDAO() external view returns (uint256) {
        return _numTokensOwnedByDAO;
    }

    function withdrawTokens(uint256[] calldata, address) external pure {}

    function forkId() external pure returns (uint32) {
        return 0;
    }

    function nounsToken() external pure returns (NounsTokenLike) {
        return NounsTokenLike(address(0));
    }

    function dao() external pure returns (address) {
        return address(0);
    }

    function ownerOfEscrowedToken(uint32, uint256) external pure returns (address owner) {
        return address(0);
    }
}

contract MockCrispVotingSidecarV5 {
    mapping(uint256 => bool) internal e3Proposals;

    uint256 internal _lastInitializedProposalId;
    bytes32 internal _lastMerkleRoot;

    function initializeE3Vote(uint256 proposalId, bytes32 merkleRoot) external {
        _lastInitializedProposalId = proposalId;
        _lastMerkleRoot = merkleRoot;
        e3Proposals[proposalId] = true;
    }

    function setIsE3Proposal(uint256 proposalId, bool isE3) external {
        e3Proposals[proposalId] = isE3;
    }

    function isE3Proposal(uint256 proposalId) external view returns (bool) {
        return e3Proposals[proposalId];
    }

    function lastInitializedProposalId() external view returns (uint256) {
        return _lastInitializedProposalId;
    }

    function lastMerkleRoot() external view returns (bytes32) {
        return _lastMerkleRoot;
    }
}

contract NounsDAOLogicV5Harness is NounsDAOLogicV5 {
    error ProposalIdTooLarge();

    function setAdmin(address admin_) external {
        ds.admin = admin_;
    }

    function setNouns(address nouns_) external {
        ds.nouns = NounsTokenLike(nouns_);
    }

    function setForkEscrow(address forkEscrow_) external {
        ds.forkEscrow = INounsDAOForkEscrow(forkEscrow_);
    }

    function setTimelock(address timelock_) external {
        ds.timelock = INounsDAOExecutorV2(timelock_);
    }

    function setGovernanceParams(
        uint256 votingDelay_,
        uint256 votingPeriod_,
        uint256 proposalThresholdBPS_,
        uint256 quorumVotesBPS_,
        uint32 proposalUpdatablePeriodInBlocks_
    ) external {
        ds.votingDelay = votingDelay_;
        ds.votingPeriod = votingPeriod_;
        ds.proposalThresholdBPS = proposalThresholdBPS_;
        ds.quorumVotesBPS = quorumVotesBPS_;
        ds.proposalUpdatablePeriodInBlocks = proposalUpdatablePeriodInBlocks_;
    }

    function setProposal(
        uint256 proposalId,
        uint256 startBlock,
        uint256 endBlock,
        uint64 updatePeriodEndBlock
    ) external {
        if (proposalId > type(uint32).max) revert ProposalIdTooLarge();

        if (proposalId > ds.proposalCount) {
            ds.proposalCount = proposalId;
        }

        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        // forge-lint: disable-next-line(unsafe-typecast)
        proposal.id = uint32(proposalId);
        proposal.startBlock = startBlock;
        proposal.endBlock = endBlock;
        proposal.updatePeriodEndBlock = updatePeriodEndBlock;
    }

    function getStoredCrispVotingSidecar() external view returns (address) {
        return ds.crispVotingSidecar;
    }

    function getStoredReceipt(uint256 proposalId, address voter) external view returns (NounsDAOTypes.Receipt memory) {
        return ds._proposals[proposalId].receipts[voter];
    }

    function getProposalVotes(uint256 proposalId) external view returns (uint256, uint256, uint256) {
        NounsDAOTypes.Proposal storage proposal = ds._proposals[proposalId];
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
    }
}

contract NounsDAOLogicV5Test is Test {
    uint256 internal constant PROPOSAL_ID = 1;
    uint96 internal constant VOTER_VOTES = 7;

    NounsDAOLogicV5Harness internal dao;
    MockNounsTokenLikeV5 internal nouns;
    MockForkEscrowV5 internal forkEscrow;
    MockCrispVotingSidecarV5 internal sidecar;

    address internal admin = makeAddr('admin');
    address internal proposer = makeAddr('proposer');
    address internal voter = makeAddr('voter');
    address internal nonAdmin = makeAddr('nonAdmin');
    address internal nonSidecar = makeAddr('nonSidecar');
    address internal timelock = makeAddr('timelock');

    function setUp() public {
        dao = new NounsDAOLogicV5Harness();
        nouns = new MockNounsTokenLikeV5();
        forkEscrow = new MockForkEscrowV5();
        sidecar = new MockCrispVotingSidecarV5();

        vm.roll(20);

        dao.setAdmin(admin);
        dao.setNouns(address(nouns));
        dao.setForkEscrow(address(forkEscrow));
        dao.setTimelock(timelock);
        dao.setGovernanceParams(1, 10, 100, 1000, 0);

        nouns.setTotalSupply(100);
        nouns.setBalanceOf(timelock, 0);
        nouns.setPriorVotes(proposer, block.number - 1, 10);

        vm.prank(admin);
        dao.setCrispVotingSidecar(address(sidecar));
    }

    function testProposeE3CallsSidecar() public {
        bytes32 merkleRoot = keccak256('root');

        vm.prank(proposer);
        uint256 proposalId = dao.proposeE3(_targets(), _values(), _signatures(), _calldatas(), 'e3 proposal', merkleRoot);

        assertEq(proposalId, 1);
        assertEq(dao.proposalCount(), 1);
        assertEq(sidecar.lastInitializedProposalId(), proposalId);
        assertEq(sidecar.lastMerkleRoot(), merkleRoot);
        assertTrue(sidecar.isE3Proposal(proposalId));
    }

    function testProposeE3RevertsIfNoSidecar() public {
        vm.prank(admin);
        dao.setCrispVotingSidecar(address(0));

        vm.prank(proposer);
        vm.expectRevert(NounsDAOVotesV5.CrispVotingSidecarNotSet.selector);
        dao.proposeE3(_targets(), _values(), _signatures(), _calldatas(), 'e3 proposal', keccak256('root'));
    }

    function testCastVoteRevertsForE3Proposal() public {
        uint256 startBlock = block.number - 1;
        dao.setProposal(PROPOSAL_ID, startBlock, block.number + 10, 0);
        sidecar.setIsE3Proposal(PROPOSAL_ID, true);

        vm.prank(voter);
        vm.expectRevert(NounsDAOVotesV5.UseCastE3Vote.selector);
        dao.castVote(PROPOSAL_ID, 1);
    }

    function testCastVoteWorksForNonE3Proposal() public {
        uint256 startBlock = block.number - 1;
        dao.setProposal(PROPOSAL_ID, startBlock, block.number + 10, 0);
        nouns.setPriorVotes(voter, startBlock, VOTER_VOTES);

        vm.prank(voter);
        dao.castVote(PROPOSAL_ID, 1);

        NounsDAOTypes.Receipt memory receipt = dao.getStoredReceipt(PROPOSAL_ID, voter);
        (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) = dao.getProposalVotes(PROPOSAL_ID);

        assertTrue(receipt.hasVoted);
        assertEq(receipt.support, 1);
        assertEq(receipt.votes, VOTER_VOTES);
        assertFalse(receipt.isE3Vote);
        assertEq(forVotes, VOTER_VOTES);
        assertEq(againstVotes, 0);
        assertEq(abstainVotes, 0);
    }

    function testSetE3TallyOnlyBySidecar() public {
        dao.setProposal(PROPOSAL_ID, block.number - 10, block.number - 1, 0);
        sidecar.setIsE3Proposal(PROPOSAL_ID, true);

        vm.prank(nonSidecar);
        vm.expectRevert(NounsDAOVotesV5.SetE3TallyNotSidecar.selector);
        dao.setE3Tally(PROPOSAL_ID, 1, 2, 3);
    }

    function testSetCrispVotingSidecarOnlyAdmin() public {
        vm.prank(nonAdmin);
        vm.expectRevert(NounsDAOLogicV5.AdminOnly.selector);
        dao.setCrispVotingSidecar(makeAddr('replacementSidecar'));
    }

    function testSetCrispVotingSidecarUpdatesStorage() public {
        address replacementSidecar = makeAddr('replacementSidecar');

        vm.prank(admin);
        dao.setCrispVotingSidecar(replacementSidecar);

        assertEq(dao.getStoredCrispVotingSidecar(), replacementSidecar);
    }

    function _targets() internal pure returns (address[] memory targets) {
        targets = new address[](1);
        targets[0] = address(0x1234);
    }

    function _values() internal pure returns (uint256[] memory values) {
        values = new uint256[](1);
        values[0] = 0;
    }

    function _signatures() internal pure returns (string[] memory signatures) {
        signatures = new string[](1);
        signatures[0] = '';
    }

    function _calldatas() internal pure returns (bytes[] memory calldatas) {
        calldatas = new bytes[](1);
        calldatas[0] = '';
    }
}
