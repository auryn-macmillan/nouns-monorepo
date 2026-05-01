import { BigInt, Bytes } from '@graphprotocol/graph-ts';

import {
  AuctionCreated,
  AuctionResultDecoded,
  AuctionSettled,
  SealedBidSubmitted,
} from './types/NounsAuctionHouseV4/NounsAuctionHouseV4';
import { SealedBid, VickreyAuction, VickreyAuctionResult } from './types/schema';

function getOrCreateVickreyAuction(nounId: string): VickreyAuction {
  let auction = VickreyAuction.load(nounId);
  if (auction == null) {
    auction = new VickreyAuction(nounId);
    auction.e3Id = Bytes.empty();
    auction.merkleRoot = Bytes.empty();
    auction.phase = 'Bidding';
    auction.bidCount = BigInt.fromI32(0);
    auction.secondPriceBucket = BigInt.fromI32(0);
    auction.secondPrice = BigInt.fromI32(0);
    auction.winner = Bytes.empty();
    auction.zeroBids = false;
    auction.startTime = BigInt.fromI32(0);
    auction.endTime = BigInt.fromI32(0);
    auction.settled = false;
  }
  return auction as VickreyAuction;
}

export function handleAuctionCreated(event: AuctionCreated): void {
  const nounId = event.params.nounId.toString();
  const auction = getOrCreateVickreyAuction(nounId);

  auction.e3Id = Bytes.empty();
  auction.merkleRoot = Bytes.empty();
  auction.phase = 'Bidding';
  auction.startTime = event.params.startTime;
  auction.endTime = event.params.endTime;
  auction.settled = false;
  auction.save();
}

export function handleSealedBidSubmitted(event: SealedBidSubmitted): void {
  const nounId = event.params.nounId.toString();
  const auction = getOrCreateVickreyAuction(nounId);

  auction.bidCount = auction.bidCount.plus(BigInt.fromI32(1));
  auction.save();

  const sealedBidId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  const sealedBid = new SealedBid(sealedBidId);
  sealedBid.auction = nounId;
  sealedBid.bidder = event.params.bidder;
  sealedBid.blockNumber = event.block.number;
  sealedBid.blockTimestamp = event.block.timestamp;
  sealedBid.save();
}

export function handleAuctionResultDecoded(event: AuctionResultDecoded): void {
  const nounId = event.params.nounId.toString();
  const auction = getOrCreateVickreyAuction(nounId);

  auction.phase = 'Revealed';
  auction.secondPriceBucket = event.params.secondPriceBucket;
  auction.winner = event.params.winner;
  auction.zeroBids = event.params.zeroBids;
  auction.save();

  const auctionResult = new VickreyAuctionResult(nounId);
  auctionResult.auction = nounId;
  auctionResult.secondPriceBucket = event.params.secondPriceBucket;
  auctionResult.winner = event.params.winner;
  auctionResult.zeroBids = event.params.zeroBids;
  auctionResult.secondPrice = auction.secondPrice;
  auctionResult.decodedAt = event.block.timestamp;
  auctionResult.save();

  auction.auctionResult = nounId;
  auction.save();
}

export function handleAuctionSettled(event: AuctionSettled): void {
  const nounId = event.params.nounId.toString();
  const auction = getOrCreateVickreyAuction(nounId);

  auction.secondPrice = event.params.amount;
  auction.winner = event.params.winner;
  auction.settled = true;
  auction.save();

  const auctionResult = VickreyAuctionResult.load(nounId);
  if (auctionResult != null) {
    auctionResult.secondPrice = event.params.amount;
    auctionResult.winner = event.params.winner;
    auctionResult.save();
  }
}
