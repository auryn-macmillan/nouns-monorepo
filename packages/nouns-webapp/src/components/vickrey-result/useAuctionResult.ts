import { useReadContract, useAccount } from 'wagmi';

const V4_AUCTION_ABI = [
  {
    name: 'getVickreyAuction',
    type: 'function',
    inputs: [{ name: 'nounId', type: 'uint256' }],
    outputs: [
      {
        components: [
          { name: 'nounId', type: 'uint256' },
          { name: 'e3Id', type: 'bytes32' },
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'phase', type: 'uint8' },
          { name: 'bidCount', type: 'uint256' },
          { name: 'secondPriceBucket', type: 'uint256' },
          { name: 'secondPrice', type: 'uint256' },
          { name: 'winner', type: 'address' },
          { name: 'zeroBids', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
  },
  {
    name: 'auction',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'nounId', type: 'uint96' },
      { name: 'amount', type: 'uint128' },
      { name: 'startTime', type: 'uint40' },
      { name: 'endTime', type: 'uint40' },
      { name: 'bidder', type: 'address' },
      { name: 'settled', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'hasSubmittedSealedBid',
    type: 'function',
    inputs: [
      { name: 'nounId', type: 'uint256' },
      { name: 'bidder', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

export function useAuctionResult({
  nounId,
  auctionAddress,
}: {
  nounId: bigint;
  auctionAddress: `0x${string}`;
}) {
  const { address } = useAccount();

  const {
    data: vickreyData,
    isLoading: isLoadingVickrey,
    isError: isErrorVickrey,
  } = useReadContract({
    address: auctionAddress,
    abi: V4_AUCTION_ABI,
    functionName: 'getVickreyAuction',
    args: [nounId],
  });

  const {
    data: auctionData,
    isLoading: isLoadingAuction,
    isError: isErrorAuction,
  } = useReadContract({
    address: auctionAddress,
    abi: V4_AUCTION_ABI,
    functionName: 'auction',
  });

  const { data: didBid, isLoading: isLoadingBid } = useReadContract({
    address: auctionAddress,
    abi: V4_AUCTION_ABI,
    functionName: 'hasSubmittedSealedBid',
    args: address !== undefined && address !== null ? [nounId, address] : undefined,
    query: {
      enabled: address !== undefined && address !== null,
    },
  });

  const isLoading = isLoadingVickrey === true || isLoadingAuction === true || isLoadingBid === true;
  const isError = isErrorVickrey === true || isErrorAuction === true;

  const isSettled =
    auctionData !== undefined &&
    ((BigInt(auctionData[0]) === nounId && auctionData[5]) || BigInt(auctionData[0]) > nounId);

  return {
    phase: vickreyData?.phase,
    winner: vickreyData?.winner,
    secondPrice: vickreyData?.secondPrice,
    totalBids: vickreyData?.bidCount,
    zeroBids: vickreyData?.zeroBids,
    settled: isSettled,
    didBid: didBid === true,
    isLoading,
    isError,
  };
}
