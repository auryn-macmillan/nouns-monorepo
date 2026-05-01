// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

contract MockCiphernodeRegistry {
    function isRegistered(address) external pure returns (bool) {
        return true;
    }
}
