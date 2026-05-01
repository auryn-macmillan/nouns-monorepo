import { useWriteContract } from 'wagmi';

import { useEncryptVote } from '../../utils/interfold/interfold-hooks';

const SIDECAR_ABI = [
  {
    name: 'castE3Vote',
    type: 'function',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'encryptedVote', type: 'bytes' },
      { name: 'merkleProof', type: 'bytes32[]' },
      { name: 'votingPower', type: 'uint96' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export function useE3Vote({
  proposalId,
  sidecarAddress,
}: {
  proposalId: bigint;
  sidecarAddress: `0x${string}`;
}) {
  const { encryptVote, isPending: isEncrypting } = useEncryptVote();
  const { writeContractAsync, isPending: isWriting, isSuccess, error } = useWriteContract();

  const castVote = async (support: 0 | 1 | 2) => {
    const votingPower = 1n;
    const publicKey = '0x' as `0x${string}`;
    const encryptedInput = await encryptVote(support, votingPower, publicKey);

    await writeContractAsync({
      address: sidecarAddress,
      abi: SIDECAR_ABI,
      functionName: 'castE3Vote',
      args: [proposalId, encryptedInput.data, [] as `0x${string}`[], votingPower],
    });
  };

  return { castVote, isPending: isEncrypting || isWriting, isSuccess, error };
}
