// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { IE3Program } from './interfaces/IE3Program.sol';

interface INounsAuctionHouseV4ProgramCallback {
    function onAuctionResultDecoded(
        uint256 nounId,
        uint256 secondPriceBucket,
        address winner,
        bool zeroBids
    ) external;
}

contract NounsVickreyProgram is IE3Program {
    struct AuctionResult {
        uint256 secondPriceBucket;
        address winner;
        bool zeroBids;
        bool decoded;
    }

    bytes32 public constant ENCRYPTION_SCHEME_ID = keccak256('fhe.rs:BFV');

    address public immutable auctionHouse;
    address public immutable enclave;

    mapping(bytes32 e3Id => uint256 nounId) public e3ToNoun;
    mapping(bytes32 e3Id => uint256 bidCount) public e3BidCounts;
    mapping(bytes32 e3Id => AuctionResult result) internal decodedResults;

    event AuctionResultVerified(bytes32 indexed e3Id, uint256 indexed nounId, address winner, bool zeroBids);

    error NotEnclave();
    error UnknownE3(bytes32 e3Id);

    modifier onlyEnclave() {
        if (msg.sender != enclave) revert NotEnclave();
        _;
    }

    constructor(address _auctionHouse, address _enclave) {
        auctionHouse = _auctionHouse;
        enclave = _enclave;
    }

    function validate(bytes32 e3Id, bytes calldata params) external onlyEnclave returns (bytes memory) {
        (uint256 nounId, ) = abi.decode(params, (uint256, bytes32));
        e3ToNoun[e3Id] = nounId;
        return abi.encode(ENCRYPTION_SCHEME_ID);
    }

    function publishInput(bytes32 e3Id, bytes calldata data) external onlyEnclave returns (bytes memory) {
        if (e3ToNoun[e3Id] == 0 && e3Id != bytes32(0)) revert UnknownE3(e3Id);
        unchecked {
            e3BidCounts[e3Id] += 1;
        }
        return data;
    }

    function verify(bytes32 e3Id, bytes calldata data) external onlyEnclave returns (bool) {
        uint256 nounId = e3ToNoun[e3Id];
        if (nounId == 0 && e3Id != bytes32(0)) revert UnknownE3(e3Id);

        (uint256 secondPriceBucket, address winner, bool zeroBids) = abi.decode(data, (uint256, address, bool));

        decodedResults[e3Id] = AuctionResult({
            secondPriceBucket: secondPriceBucket,
            winner: winner,
            zeroBids: zeroBids,
            decoded: true
        });

        INounsAuctionHouseV4ProgramCallback(auctionHouse).onAuctionResultDecoded(
            nounId,
            secondPriceBucket,
            winner,
            zeroBids
        );

        emit AuctionResultVerified(e3Id, nounId, winner, zeroBids);
        return true;
    }

    function decodeAuctionResult(bytes32 e3Id) external view returns (uint256 secondPriceBucket, address winner, bool zeroBids) {
        AuctionResult memory result = decodedResults[e3Id];
        return (result.secondPriceBucket, result.winner, result.zeroBids);
    }
}
