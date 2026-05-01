// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import 'forge-std/Test.sol';
import { IE3Enclave } from '../../contracts/interfaces/IE3Enclave.sol';
import { CrispVotingSidecar } from '../../contracts/governance/CrispVotingSidecar.sol';
import { MockEnclave } from '../../contracts/mocks/Interfold/MockEnclave.sol';

contract MockGovernor {
    mapping(uint256 proposalId => uint256 endBlock) internal _proposalEndBlocks;

    uint256 public lastProposalId;
    uint96 public lastForVotes;
    uint96 public lastAgainstVotes;
    uint96 public lastAbstainVotes;

    function setProposalEndBlock(uint256 proposalId, uint256 endBlock) external {
        _proposalEndBlocks[proposalId] = endBlock;
    }

    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external {
        lastProposalId = proposalId;
        lastForVotes = forVotes;
        lastAgainstVotes = againstVotes;
        lastAbstainVotes = abstainVotes;
    }

    function proposals(uint256 proposalId) external view returns (uint256 endBlock) {
        return _proposalEndBlocks[proposalId];
    }

    function votingPeriod() external pure returns (uint256) {
        return 20;
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

contract CrispVotingSidecarTest is Test {
    uint256 internal constant PROPOSAL_ID = 77;
    address internal constant VOTER = address(0xB0B);

    MockEnclave internal mockEnclave;
    MockEnclaveAdapter internal enclave;
    MockGovernor internal governor;
    CrispVotingSidecar internal sidecar;

    event E3VoteInitialized(uint256 indexed proposalId, bytes32 indexed e3Id, bytes32 merkleRoot);
    event E3VoteCast(uint256 indexed proposalId, address indexed voter);
    event E3TallyDecrypted(uint256 indexed proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes);

    function setUp() public {
        mockEnclave = new MockEnclave();
        enclave = new MockEnclaveAdapter(address(mockEnclave));
        governor = new MockGovernor();
        sidecar = new CrispVotingSidecar(address(governor), address(enclave), address(0xCAFE));
        governor.setProposalEndBlock(PROPOSAL_ID, block.number + 20);
    }

    function testInitializeE3Vote() public {
        bytes32 merkleRoot = keccak256('root');

        vm.expectEmit(true, true, false, true);
        emit E3VoteInitialized(PROPOSAL_ID, bytes32(uint256(0)), merkleRoot);

        vm.prank(address(governor));
        sidecar.initializeE3Vote(PROPOSAL_ID, merkleRoot);

        (bytes32 e3Id, bytes32 storedRoot, CrispVotingSidecar.Phase phase, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) =
            sidecar.e3States(PROPOSAL_ID);

        assertEq(e3Id, bytes32(uint256(0)));
        assertEq(storedRoot, merkleRoot);
        assertEq(uint256(phase), uint256(CrispVotingSidecar.Phase.AcceptingInputs));
        assertEq(forVotes, 0);
        assertEq(againstVotes, 0);
        assertEq(abstainVotes, 0);
        assertEq(sidecar.e3ToProposal(bytes32(uint256(0))), PROPOSAL_ID);
        assertEq(sidecar.e3Timeout(), 40);
    }

    function testCastE3Vote() public {
        uint96 votingPower = 5;
        _initialize(bytes32(keccak256(abi.encodePacked(VOTER, votingPower))));
        mockEnclave.publishCommitteePublicKey(0, hex'1234');

        bytes32[] memory proof = new bytes32[](0);

        vm.expectEmit(true, true, false, true);
        emit E3VoteCast(PROPOSAL_ID, VOTER);

        vm.prank(VOTER);
        sidecar.castE3Vote(PROPOSAL_ID, hex'abcd', proof, votingPower);

        assertEq(mockEnclave.getCiphertextCount(0), 1);
        assertEq(mockEnclave.getCiphertext(0, 0), hex'abcd');
    }

    function testOnTallyDecrypted() public {
        _initialize(bytes32(keccak256(abi.encodePacked(VOTER))));

        vm.expectEmit(true, false, false, true);
        emit E3TallyDecrypted(PROPOSAL_ID, 10, 3, 1);

        vm.prank(address(enclave));
        sidecar.setE3Tally(PROPOSAL_ID, 10, 3, 1);

        (, , CrispVotingSidecar.Phase phase, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) = sidecar.e3States(
            PROPOSAL_ID
        );

        assertEq(uint256(phase), uint256(CrispVotingSidecar.Phase.Decrypted));
        assertEq(forVotes, 10);
        assertEq(againstVotes, 3);
        assertEq(abstainVotes, 1);
        assertEq(governor.lastProposalId(), PROPOSAL_ID);
        assertEq(governor.lastForVotes(), 10);
        assertEq(governor.lastAgainstVotes(), 3);
        assertEq(governor.lastAbstainVotes(), 1);
    }

    function testUnauthorizedInitialize() public {
        vm.expectRevert(CrispVotingSidecar.NotGovernor.selector);
        sidecar.initializeE3Vote(PROPOSAL_ID, bytes32(uint256(1)));
    }

    function testUnauthorizedTally() public {
        _initialize(bytes32(keccak256(abi.encodePacked(VOTER))));

        vm.expectRevert(CrispVotingSidecar.NotEnclave.selector);
        sidecar.setE3Tally(PROPOSAL_ID, 1, 2, 3);
    }

    function testInvalidMerkleProof() public {
        _initialize(keccak256(abi.encodePacked(address(0xDEAD), uint96(5))));
        mockEnclave.publishCommitteePublicKey(0, hex'1234');

        bytes32[] memory proof = new bytes32[](0);

        vm.prank(VOTER);
        vm.expectRevert(CrispVotingSidecar.InvalidMerkleProof.selector);
        sidecar.castE3Vote(PROPOSAL_ID, hex'abcd', proof, 5);
    }

    function _initialize(bytes32 merkleRoot) internal {
        vm.prank(address(governor));
        sidecar.initializeE3Vote(PROPOSAL_ID, merkleRoot);
    }
}
