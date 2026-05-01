// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

contract MockDecryptionVerifier {
    function verify(bytes32, bytes calldata) external pure returns (bool) {
        return true;
    }
}
