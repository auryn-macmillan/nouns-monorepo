// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IE3Program {
    function validate(bytes32 e3Id, bytes calldata params) external returns (bytes memory);

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory);

    function verify(bytes32 e3Id, bytes calldata data) external returns (bool);
}
