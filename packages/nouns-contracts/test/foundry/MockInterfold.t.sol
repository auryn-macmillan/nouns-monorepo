// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import 'forge-std/Test.sol';
import { MockEnclave } from '../../contracts/mocks/Interfold/MockEnclave.sol';
import { MockE3Program } from '../../contracts/mocks/Interfold/MockE3Program.sol';

contract MockInterfoldTest is Test {
    struct E3 {
        address requester;
        address program;
        bytes params;
        bytes committeePublicKey;
        bytes plaintextOutput;
    }

    MockEnclave internal enclave;
    MockE3Program internal program;

    event E3Requested(uint256 e3Id, E3 e3, address indexed e3Program);
    event CommitteePublicKeyPublished(uint256 indexed e3Id, bytes publicKey);
    event InputPublished(uint256 indexed e3Id, bytes data, uint256 inputHash, uint256 index);
    event PlaintextOutputPublished(uint256 indexed e3Id, bytes plaintextOutput);

    function setUp() public {
        enclave = new MockEnclave();
        program = new MockE3Program();
    }

    function testMockInterfoldLifecycle() public {
        bytes memory params = abi.encode(uint256(7));
        bytes memory pubkey = hex'1234';
        bytes memory input = hex'abcd';
        bytes memory tally = abi.encode(uint256(11), uint256(13));
        E3 memory expectedE3 = E3({
            requester: address(this),
            program: address(program),
            params: params,
            committeePublicKey: '',
            plaintextOutput: ''
        });

        vm.expectEmit(true, true, false, true);
        emit E3Requested(0, expectedE3, address(program));
        uint256 e3Id = enclave.request(MockEnclave.RequestParams({ program: address(program), params: params }));

        assertEq(e3Id, 0);
        (, MockEnclave.Phase requestedPhase, , ) = enclave.getE3State(e3Id);
        assertEq(uint256(requestedPhase), uint256(MockEnclave.Phase.Requested));

        vm.expectEmit(true, false, false, true);
        emit CommitteePublicKeyPublished(e3Id, pubkey);
        enclave.publishCommitteePublicKey(e3Id, pubkey);

        vm.expectEmit(true, false, false, true);
        emit InputPublished(e3Id, input, uint256(keccak256(input)), 0);
        enclave.publishInput(e3Id, input);

        enclave.requestCompute(e3Id);
        program.setTallyResult(bytes32(e3Id), tally);
        assertTrue(enclave.submitDecryption(e3Id, tally));

        vm.expectEmit(true, false, false, true);
        emit PlaintextOutputPublished(e3Id, tally);
        enclave.publishPlaintextOutput(e3Id, tally);

        (address storedProgram, MockEnclave.Phase phase, uint256 ciphertextCount, bytes memory storedTally) = enclave.getE3State(e3Id);
        assertEq(storedProgram, address(program));
        assertEq(uint256(phase), uint256(MockEnclave.Phase.Complete));
        assertEq(ciphertextCount, 1);
        assertEq(storedTally, tally);

        _assertStoredE3(e3Id, params, pubkey, tally);
    }

    function _assertStoredE3(uint256 e3Id, bytes memory params, bytes memory pubkey, bytes memory tally) internal {
        (address requester, address storedProgramInE3, bytes memory storedParams, bytes memory storedPubkey, bytes memory plaintextOutput) = enclave
            .e3s(e3Id);
        assertEq(requester, address(this));
        assertEq(storedProgramInE3, address(program));
        assertEq(storedParams, params);
        assertEq(storedPubkey, pubkey);
        assertEq(plaintextOutput, tally);
    }
}
