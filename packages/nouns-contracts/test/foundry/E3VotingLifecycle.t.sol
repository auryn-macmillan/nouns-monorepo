// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import 'forge-std/Test.sol';
import { IE3Enclave } from '../../contracts/interfaces/IE3Enclave.sol';
import { MockEnclave } from '../../contracts/mocks/Interfold/MockEnclave.sol';
import { CrispVotingSidecar } from '../../contracts/governance/CrispVotingSidecar.sol';
import { NounsCrispProgram } from '../../contracts/governance/NounsCrispProgram.sol';

contract MockGovernor {
    struct Proposal {
        uint256 endBlock;
    }

    mapping(uint256 proposalId => Proposal proposal) public proposals;

    uint256 public lastProposalId;
    uint96 public lastForVotes;
    uint96 public lastAgainstVotes;
    uint96 public lastAbstainVotes;
    uint256 public tallyCallCount;

    function setProposalEndBlock(uint256 proposalId, uint256 endBlock) external {
        proposals[proposalId] = Proposal({ endBlock: endBlock });
    }

    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external {
        lastProposalId = proposalId;
        lastForVotes = forVotes;
        lastAgainstVotes = againstVotes;
        lastAbstainVotes = abstainVotes;
        tallyCallCount += 1;
    }

    function votingPeriod() external pure returns (uint256) {
        return 100;
    }
}

contract MockEnclaveAdapter is IE3Enclave {
    MockEnclave internal immutable enclave;

    constructor(address _enclave) {
        enclave = MockEnclave(_enclave);
    }

    function request(RequestParams calldata params) external returns (bytes32 e3Id) {
        return bytes32(enclave.request(MockEnclave.RequestParams({ program: params.program, params: params.params })));
    }

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory) {
        return enclave.publishInput(uint256(e3Id), data);
    }

    function getCiphertextCount(bytes32 e3Id) external view returns (uint256) {
        return enclave.getCiphertextCount(uint256(e3Id));
    }
}

contract E3VotingLifecycleTest is Test {
    uint256 internal constant PROPOSAL_ID = 77;
    uint256 internal constant PROPOSAL_END_BLOCK = 26;
    address internal constant VOTER_ONE = address(0xB0B);
    address internal constant VOTER_TWO = address(0xA11CE);
    address internal constant VOTER_THREE = address(0xCA11AB1E);
    uint96 internal constant POWER_ONE = 5;
    uint96 internal constant POWER_TWO = 7;
    uint96 internal constant POWER_THREE = 9;

    MockEnclave internal mockEnclave;
    MockEnclaveAdapter internal enclave;
    MockGovernor internal governor;
    CrispVotingSidecar internal sidecar;
    event E3VoteDecayed(uint256 indexed proposalId);

    function setUp() public {
        mockEnclave = new MockEnclave();
        enclave = new MockEnclaveAdapter(address(mockEnclave));
        governor = new MockGovernor();
        sidecar = new CrispVotingSidecar(address(governor), address(enclave), address(0xCAFE));
        new NounsCrispProgram(address(sidecar), address(enclave));
        governor.setProposalEndBlock(PROPOSAL_ID, PROPOSAL_END_BLOCK);
    }

    function testFullE3VotingLifecycle() public {
        bytes32 leafOne = _leaf(VOTER_ONE, POWER_ONE);
        bytes32 leafTwo = _leaf(VOTER_TWO, POWER_TWO);
        bytes32 merkleRoot = _hashPair(leafOne, leafTwo);

        _initializeProposal(merkleRoot);
        mockEnclave.publishCommitteePublicKey(0, hex'1234');

        vm.prank(VOTER_ONE);
        sidecar.castE3Vote(PROPOSAL_ID, hex'aaaa', _singleProof(leafTwo), POWER_ONE);

        vm.prank(VOTER_TWO);
        sidecar.castE3Vote(PROPOSAL_ID, hex'bbbb', _singleProof(leafOne), POWER_TWO);

        assertEq(mockEnclave.getCiphertextCount(0), 2);

        mockEnclave.requestCompute(0);

        vm.prank(address(enclave));
        sidecar.setE3Tally(PROPOSAL_ID, 12, 7, 1);

        _assertStoredTally(12, 7, 1);
        assertEq(governor.tallyCallCount(), 1);
    }

    function testForceDecay() public {
        _initializeProposal(_leaf(VOTER_ONE, POWER_ONE));

        vm.roll(PROPOSAL_END_BLOCK + sidecar.e3Timeout() + 1);

        vm.expectEmit(true, false, false, false);
        emit E3VoteDecayed(PROPOSAL_ID);
        sidecar.forceDecay(PROPOSAL_ID);

        (, , CrispVotingSidecar.Phase phase, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) = sidecar.e3States(PROPOSAL_ID);

        assertEq(uint256(phase), uint256(CrispVotingSidecar.Phase.Decrypted));
        assertEq(forVotes, 0);
        assertEq(againstVotes, 0);
        assertEq(abstainVotes, 0);
        assertEq(governor.tallyCallCount(), 1);
        _assertGovernorTally(0, 0, 0);
    }

    function testMultipleVotersCastE3Votes() public {
        bytes32 leafOne = _leaf(VOTER_ONE, POWER_ONE);
        bytes32 leafTwo = _leaf(VOTER_TWO, POWER_TWO);
        bytes32 leafThree = _leaf(VOTER_THREE, POWER_THREE);
        bytes32 leftBranch = _hashPair(leafOne, leafTwo);
        bytes32 merkleRoot = _hashPair(leftBranch, leafThree);

        _initializeProposal(merkleRoot);
        mockEnclave.publishCommitteePublicKey(0, hex'1234');

        vm.startPrank(VOTER_ONE);
        sidecar.castE3Vote(PROPOSAL_ID, hex'01', _doubleProof(leafTwo, leafThree), POWER_ONE);
        vm.stopPrank();

        vm.startPrank(VOTER_TWO);
        sidecar.castE3Vote(PROPOSAL_ID, hex'02', _doubleProof(leafOne, leafThree), POWER_TWO);
        vm.stopPrank();

        vm.startPrank(VOTER_THREE);
        sidecar.castE3Vote(PROPOSAL_ID, hex'03', _singleProof(leftBranch), POWER_THREE);
        vm.stopPrank();

        assertEq(mockEnclave.getCiphertextCount(0), 3);
    }

    function testDoubleE3VotePrevented() public {
        _initializeProposal(_leaf(VOTER_ONE, POWER_ONE));
        mockEnclave.publishCommitteePublicKey(0, hex'1234');

        vm.prank(VOTER_ONE);
        sidecar.castE3Vote(PROPOSAL_ID, hex'aaaa', new bytes32[](0), POWER_ONE);

        vm.prank(VOTER_ONE);
        vm.expectRevert(abi.encodeWithSelector(CrispVotingSidecar.AlreadyVoted.selector, VOTER_ONE, PROPOSAL_ID));
        sidecar.castE3Vote(PROPOSAL_ID, hex'bbbb', new bytes32[](0), POWER_ONE);
    }

    function testNonE3ProposalUnaffected() public {
        assertFalse(sidecar.isE3Proposal(PROPOSAL_ID));
        assertEq(sidecar.validate(bytes32(uint256(1)), hex''), '');
        assertEq(sidecar.publishInput(bytes32(uint256(1)), hex'cafe'), hex'cafe');
        assertTrue(sidecar.verify(bytes32(uint256(1)), hex'01'));
    }

    function testSidecarCallsGovernorOnTally() public {
        _initializeProposal(_leaf(VOTER_ONE, POWER_ONE));

        vm.prank(address(enclave));
        sidecar.setE3Tally(PROPOSAL_ID, 33, 11, 4);

        assertEq(governor.tallyCallCount(), 1);
        _assertGovernorTally(33, 11, 4);
    }

    function _initializeProposal(bytes32 merkleRoot) internal {
        vm.prank(address(governor));
        sidecar.initializeE3Vote(PROPOSAL_ID, merkleRoot);
    }

    function _assertStoredTally(uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) internal {
        (, , CrispVotingSidecar.Phase phase, uint96 storedForVotes, uint96 storedAgainstVotes, uint96 storedAbstainVotes) = sidecar.e3States(
            PROPOSAL_ID
        );

        assertEq(uint256(phase), uint256(CrispVotingSidecar.Phase.Decrypted));
        assertEq(storedForVotes, forVotes);
        assertEq(storedAgainstVotes, againstVotes);
        assertEq(storedAbstainVotes, abstainVotes);
        _assertGovernorTally(forVotes, againstVotes, abstainVotes);
    }

    function _assertGovernorTally(uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) internal {
        assertEq(governor.lastProposalId(), PROPOSAL_ID);
        assertEq(governor.lastForVotes(), forVotes);
        assertEq(governor.lastAgainstVotes(), againstVotes);
        assertEq(governor.lastAbstainVotes(), abstainVotes);
    }

    function _leaf(address voter, uint96 votingPower) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(voter, votingPower));
    }

    function _singleProof(bytes32 value) internal pure returns (bytes32[] memory proof) {
        proof = new bytes32[](1);
        proof[0] = value;
    }

    function _doubleProof(bytes32 first, bytes32 second) internal pure returns (bytes32[] memory proof) {
        proof = new bytes32[](2);
        proof[0] = first;
        proof[1] = second;
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
}
