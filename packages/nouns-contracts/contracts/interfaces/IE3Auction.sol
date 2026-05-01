// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IE3Auction {
    function submitSealedBid(uint256 nounId, bytes calldata encryptedBid, bytes32[] calldata merkleProof) external payable;

    function revealAuctionResult(uint256 nounId, uint256 secondPriceBucket, address winner) external;

    function settleAuction(uint256 nounId) external;
}
