import { useWriteContract } from 'wagmi';

import { useEncryptBid } from '../../utils/interfold/interfold-hooks';

const V4_AUCTION_ABI = [
  {
    name: 'submitSealedBid',
    type: 'function',
    inputs: [
      { name: 'nounId', type: 'uint256' },
      { name: 'encryptedBid', type: 'bytes' },
      { name: 'merkleProof', type: 'bytes32[]' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

export function useSealedBid({
  nounId,
  auctionAddress,
}: {
  nounId: bigint;
  auctionAddress: `0x${string}`;
}) {
  const { encryptBid, isPending: isEncrypting } = useEncryptBid();
  const { writeContractAsync, isPending: isWriting, isSuccess, error } = useWriteContract();

  const placeBid = async (priceBucket: number, maxPriceWei: bigint) => {
    const publicKey = '0x' as `0x${string}`;
    const encryptedInput = await encryptBid(priceBucket, publicKey);

    await writeContractAsync({
      address: auctionAddress,
      abi: V4_AUCTION_ABI,
      functionName: 'submitSealedBid',
      args: [nounId, encryptedInput.data, [] as `0x${string}`[]],
      value: maxPriceWei,
    });
  };

  return { placeBid, isPending: isEncrypting || isWriting, isSuccess, error };
}
