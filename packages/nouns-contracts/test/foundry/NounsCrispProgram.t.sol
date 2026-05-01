// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { Test } from 'forge-std/Test.sol';
import { NounsCrispProgram } from '../../contracts/governance/NounsCrispProgram.sol';

/// @dev Minimal mock sidecar that records the last setE3Tally call.
contract MockSidecar {
    uint256 public lastProposalId;
    uint96 public lastForVotes;
    uint96 public lastAgainstVotes;
    uint96 public lastAbstainVotes;
    bool public tallyCalled;

    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external {
        lastProposalId = proposalId;
        lastForVotes = forVotes;
        lastAgainstVotes = againstVotes;
        lastAbstainVotes = abstainVotes;
        tallyCalled = true;
    }
}

contract NounsCrispProgramTest is Test {
    NounsCrispProgram internal program;
    MockSidecar internal mockSidecar;

    address internal enclave = address(0xE3C1A7E);
    bytes32 internal e3Id = keccak256('test-e3-id');
    uint256 internal proposalId = 42;
    bytes32 internal merkleRoot = keccak256('merkle-root');

    function setUp() public {
        mockSidecar = new MockSidecar();
        program = new NounsCrispProgram(address(mockSidecar), enclave);
    }

    // ─── validate ─────────────────────────────────────────────────────────────

    function testValidateStoresProposalId() public {
        bytes memory params = abi.encode(proposalId, merkleRoot);
        program.validate(e3Id, params);
        assertEq(program.e3ToProposal(e3Id), proposalId);
    }

    function testValidateReturnsEncryptionSchemeId() public {
        bytes memory params = abi.encode(proposalId, merkleRoot);
        bytes memory result = program.validate(e3Id, params);
        bytes32 schemeId = abi.decode(result, (bytes32));
        assertEq(schemeId, program.ENCRYPTION_SCHEME_ID());
    }

    // ─── publishInput ─────────────────────────────────────────────────────────

    function testPublishInputPassthrough() public {
        // First register the e3Id
        program.validate(e3Id, abi.encode(proposalId, merkleRoot));

        bytes memory inputData = abi.encode(uint256(0xDEADBEEF));
        vm.prank(enclave);
        bytes memory result = program.publishInput(e3Id, inputData);
        assertEq(result, inputData);
    }

    function testPublishInputOnlyEnclave() public {
        program.validate(e3Id, abi.encode(proposalId, merkleRoot));

        bytes memory inputData = abi.encode(uint256(0xDEADBEEF));
        vm.expectRevert(NounsCrispProgram.NotEnclave.selector);
        program.publishInput(e3Id, inputData);
    }

    function testPublishInputUnknownE3Reverts() public {
        bytes32 unknownId = keccak256('unknown');
        bytes memory inputData = abi.encode(uint256(1));
        vm.prank(enclave);
        vm.expectRevert(abi.encodeWithSelector(NounsCrispProgram.UnknownE3.selector, unknownId));
        program.publishInput(unknownId, inputData);
    }

    // ─── verify ───────────────────────────────────────────────────────────────

    function testVerifyCallsSidecarTally() public {
        program.validate(e3Id, abi.encode(proposalId, merkleRoot));

        uint96 forVotes = 100;
        uint96 againstVotes = 50;
        uint96 abstainVotes = 10;
        bytes memory tallyData = abi.encode(forVotes, againstVotes, abstainVotes);

        vm.prank(enclave);
        bool ok = program.verify(e3Id, tallyData);

        assertTrue(ok);
        assertTrue(mockSidecar.tallyCalled());
        assertEq(mockSidecar.lastProposalId(), proposalId);
        assertEq(mockSidecar.lastForVotes(), forVotes);
        assertEq(mockSidecar.lastAgainstVotes(), againstVotes);
        assertEq(mockSidecar.lastAbstainVotes(), abstainVotes);
    }

    function testVerifyOnlyEnclave() public {
        program.validate(e3Id, abi.encode(proposalId, merkleRoot));

        bytes memory tallyData = abi.encode(uint96(1), uint96(0), uint96(0));
        vm.expectRevert(NounsCrispProgram.NotEnclave.selector);
        program.verify(e3Id, tallyData);
    }

    function testVerifyEmitsTallyVerified() public {
        program.validate(e3Id, abi.encode(proposalId, merkleRoot));

        bytes memory tallyData = abi.encode(uint96(5), uint96(3), uint96(1));
        vm.expectEmit(true, true, false, false);
        emit NounsCrispProgram.TallyVerified(e3Id, proposalId);

        vm.prank(enclave);
        program.verify(e3Id, tallyData);
    }

    function testVerifyUnknownE3Reverts() public {
        bytes32 unknownId = keccak256('unknown');
        bytes memory tallyData = abi.encode(uint96(1), uint96(0), uint96(0));
        vm.prank(enclave);
        vm.expectRevert(abi.encodeWithSelector(NounsCrispProgram.UnknownE3.selector, unknownId));
        program.verify(unknownId, tallyData);
    }
}
