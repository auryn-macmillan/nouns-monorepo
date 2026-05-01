import { useReadContract, useAccount } from 'wagmi';

const SIDECAR_READ_ABI = [
  {
    name: 'e3States',
    type: 'function',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'e3Id', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'phase', type: 'uint8' },
      { name: 'forVotes', type: 'uint96' },
      { name: 'againstVotes', type: 'uint96' },
      { name: 'abstainVotes', type: 'uint96' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'hasSubmittedE3Vote',
    type: 'function',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

export function useE3ProposalState({
  proposalId,
  sidecarAddress,
}: {
  proposalId: bigint;
  sidecarAddress?: `0x${string}`;
}) {
  const { address } = useAccount();

  const stateQuery = useReadContract({
    address: sidecarAddress,
    abi: SIDECAR_READ_ABI,
    functionName: 'e3States',
    args: [proposalId],
    query: {
      enabled: !!sidecarAddress && !!proposalId,
    },
  });

  const hasVotedQuery = useReadContract({
    address: sidecarAddress,
    abi: SIDECAR_READ_ABI,
    functionName: 'hasSubmittedE3Vote',
    args: [proposalId, address as `0x${string}`],
    query: {
      enabled: !!sidecarAddress && !!proposalId && !!address,
    },
  });

  let phase: 'None' | 'AcceptingInputs' | 'Computing' | 'Decrypted' = 'None';
  let forVotes = 0;
  let againstVotes = 0;
  let abstainVotes = 0;

  const stateData = stateQuery.data;

  if (stateData) {
    const p = stateData[2];
    if (p === 1) phase = 'AcceptingInputs';
    else if (p === 2) phase = 'Computing';
    else if (p === 3) phase = 'Decrypted';

    forVotes = Number(stateData[3]);
    againstVotes = Number(stateData[4]);
    abstainVotes = Number(stateData[5]);
  }

  const hasVoted = hasVotedQuery.data ?? false;

  return {
    phase,
    forVotes,
    againstVotes,
    abstainVotes,
    hasVoted,
    isLoading: stateQuery.isLoading || hasVotedQuery.isLoading,
  };
}
