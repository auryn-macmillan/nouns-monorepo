// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { INounsAuctionHouseV3 } from './INounsAuctionHouseV3.sol';

interface INounsAuctionHouseV4 is INounsAuctionHouseV3 {
    enum Phase {
        Bidding,
        Computing,
        Revealed
    }

    struct VickreyAuctionView {
        uint256 nounId;
        bytes32 e3Id;
        bytes32 merkleRoot;
        Phase phase;
        uint256 bidCount;
        uint256 secondPriceBucket;
        uint256 secondPrice;
        address winner;
        bool zeroBids;
    }

    event SealedBidSubmitted(uint256 indexed nounId, address indexed bidder);
    event AuctionResultDecoded(uint256 indexed nounId, uint256 secondPriceBucket, address winner, bool zeroBids);

    function submitSealedBid(uint256 nounId, bytes calldata encryptedBid, bytes32[] calldata merkleProof) external payable;

    function initializeV4(address enclave, address program, bytes32 bidderMerkleRoot) external;

    function onAuctionResultDecoded(
        uint256 nounId,
        uint256 secondPriceBucket,
        address winner,
        bool zeroBids
    ) external;

    function currentPhase() external view returns (Phase);

    function getVickreyAuction(uint256 nounId) external view returns (VickreyAuctionView memory);

    function bidderMerkleRoot() external view returns (bytes32);

    function MIN_PRICE() external view returns (uint256);

    function MAX_PRICE() external view returns (uint256);

    function PRICE_LADDER_BUCKETS() external view returns (uint256);
}
