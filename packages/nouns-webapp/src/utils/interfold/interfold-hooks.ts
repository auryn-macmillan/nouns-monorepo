import type { E3Phase, EncryptedInput } from './enclave-sdk-stub';
import type { E3VotingState, E3AuctionState } from './interfold-types';

import { useMutation } from '@tanstack/react-query';
import { useChainId, useReadContract } from 'wagmi';

import { crispVotingSidecarAbi } from '@/contracts/crisp-voting-sidecar.gen';
import { mockEnclaveAbi } from '@/contracts/mock-enclave.gen';

import { E3Client } from './interfold-client';
import { getInterfoldConfig } from './interfold-config';

// Maps on-chain phase enum (uint8) to E3Phase string
const PHASE_MAP: Record<number, E3Phase> = {
  0: 'None',
  1: 'Requested',
  2: 'KeyPublished',
  3: 'InputsReady',
  4: 'Computing',
  5: 'Complete',
};

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

function useE3Client(): E3Client {
  const chainId = useChainId();
  return new E3Client(getInterfoldConfig(chainId));
}

export function useE3VotingState(proposalId: bigint): {
  data: E3VotingState | undefined;
  isLoading: boolean;
} {
  const chainId = useChainId();
  const interfoldConfig = getInterfoldConfig(chainId);
  const isLocal = chainId === 31337; // local hardhat

  // Read e3States mapping from CrispVotingSidecar
  // Returns tuple: [bytes32 e3Id, bytes32 merkleRoot, uint8 phase, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes]
  const { data: e3StateData, isLoading } = useReadContract({
    abi: crispVotingSidecarAbi,
    address: interfoldConfig.sidecarAddress,
    functionName: 'e3States',
    args: [proposalId],
    query: {
      enabled: isLocal && interfoldConfig.sidecarAddress !== undefined && proposalId > 0n,
    },
  });

  if (!proposalId || proposalId === 0n) {
    return { data: undefined, isLoading: false };
  }

  const rawE3Id = e3StateData ? ((e3StateData as readonly unknown[])[0] as `0x${string}`) : null;
  const onChainPhase = e3StateData ? Number((e3StateData as readonly unknown[])[2]) : 0;
  const phase: E3Phase = isLocal && e3StateData ? (PHASE_MAP[onChainPhase] ?? 'None') : 'None';
  const e3Id = rawE3Id && rawE3Id !== ZERO_BYTES32 ? rawE3Id : null;

  return {
    data: {
      proposalId,
      e3Id,
      phase,
      tallyResult: null, // populated when phase === 'Complete'
    },
    isLoading,
  };
}

export function useE3AuctionState(nounId: bigint): {
  data: E3AuctionState | undefined;
  isLoading: boolean;
} {
  const chainId = useChainId();
  const interfoldConfig = getInterfoldConfig(chainId);
  const isLocal = chainId === 31337; // local hardhat

  // For local dev, auction E3 is always e3Id=0 (created by unpause())
  // getE3State(uint256 e3Id) returns uint8 phase
  const { data: enclavePhase, isLoading } = useReadContract({
    abi: mockEnclaveAbi,
    address: interfoldConfig.enclaveAddress as `0x${string}`,
    functionName: 'getE3State',
    args: [0n],
    query: {
      enabled: isLocal && nounId > 0n,
    },
  });

  if (!nounId || nounId === 0n) {
    return { data: undefined, isLoading: false };
  }

  const onChainPhase = enclavePhase !== undefined ? Number(enclavePhase) : 0;
  const phase: E3Phase =
    isLocal && enclavePhase !== undefined ? (PHASE_MAP[onChainPhase] ?? 'None') : 'None';

  return {
    data: {
      nounId,
      e3Id: isLocal ? (ZERO_BYTES32 as `0x${string}`) : null,
      phase,
      result: null,
    },
    isLoading,
  };
}

export function useEncryptVote(): {
  encryptVote: (
    support: 0 | 1 | 2,
    votingPower: bigint,
    publicKey: `0x${string}`,
  ) => Promise<EncryptedInput>;
  isPending: boolean;
} {
  const client = useE3Client();
  const mutation = useMutation({
    mutationFn: ({
      support,
      votingPower,
      publicKey,
    }: {
      support: 0 | 1 | 2;
      votingPower: bigint;
      publicKey: `0x${string}`;
    }) => client.encryptVote(support, votingPower, publicKey),
  });

  return {
    encryptVote: (support, votingPower, publicKey) =>
      mutation.mutateAsync({ support, votingPower, publicKey }),
    isPending: mutation.isPending,
  };
}

export function useEncryptBid(): {
  encryptBid: (priceBucket: number, publicKey: `0x${string}`) => Promise<EncryptedInput>;
  isPending: boolean;
} {
  const client = useE3Client();
  const mutation = useMutation({
    mutationFn: ({ priceBucket, publicKey }: { priceBucket: number; publicKey: `0x${string}` }) =>
      client.encryptBid(priceBucket, publicKey),
  });

  return {
    encryptBid: (priceBucket, publicKey) => mutation.mutateAsync({ priceBucket, publicKey }),
    isPending: mutation.isPending,
  };
}
