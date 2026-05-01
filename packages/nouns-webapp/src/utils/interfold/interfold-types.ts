import type { E3Phase, E3TallyResult, E3AuctionResult } from './enclave-sdk-stub';

export interface E3VotingState {
  proposalId: bigint;
  e3Id: `0x${string}` | null;
  phase: E3Phase;
  tallyResult: E3TallyResult | null;
}

export interface E3AuctionState {
  nounId: bigint;
  e3Id: `0x${string}` | null;
  phase: E3Phase;
  result: E3AuctionResult | null;
}
