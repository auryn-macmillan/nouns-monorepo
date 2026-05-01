// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IE3Enclave {
    struct RequestParams {
        address program;
        bytes params;
    }

    function request(RequestParams calldata params) external returns (bytes32 e3Id);

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory);

    function getCiphertextCount(bytes32 e3Id) external view returns (uint256);
}
