// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IE3Program {
    function validate(bytes32 e3Id, bytes calldata params) external returns (bytes memory);

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory);

    function verify(bytes32 e3Id, bytes calldata data) external returns (bool);
}

contract MockE3Program is IE3Program {
    bytes32 public constant ENCRYPTION_SCHEME_ID = keccak256('fhe.rs:BFV');

    mapping(bytes32 e3Id => bytes) private _tallyResults;
    mapping(bytes32 e3Id => bytes) public validationParams;
    mapping(bytes32 e3Id => bytes[]) private _inputs;

    function validate(bytes32 e3Id, bytes calldata params) external returns (bytes memory) {
        validationParams[e3Id] = params;
        return abi.encode(ENCRYPTION_SCHEME_ID);
    }

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory) {
        _inputs[e3Id].push(data);
        return data;
    }

    function verify(bytes32 e3Id, bytes calldata data) external view returns (bool) {
        bytes storage tally = _tallyResults[e3Id];

        if (tally.length == 0) {
            return data.length > 0;
        }

        return keccak256(tally) == keccak256(data);
    }

    function setTallyResult(bytes32 e3Id, bytes calldata tally) external {
        _tallyResults[e3Id] = tally;
    }

    function getTallyResult(bytes32 e3Id) external view returns (bytes memory) {
        return _tallyResults[e3Id];
    }

    function getInputCount(bytes32 e3Id) external view returns (uint256) {
        return _inputs[e3Id].length;
    }

    function getInput(bytes32 e3Id, uint256 index) external view returns (bytes memory) {
        return _inputs[e3Id][index];
    }
}
