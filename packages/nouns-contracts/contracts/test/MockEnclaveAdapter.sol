// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { IE3Enclave } from '../interfaces/IE3Enclave.sol';
import { MockEnclave } from '../mocks/Interfold/MockEnclave.sol';

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
