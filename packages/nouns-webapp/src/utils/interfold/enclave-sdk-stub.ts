// Local type stub for @enclave-e3/sdk (not yet published on npm).

export interface E3RequestParams {
  program: `0x${string}`;
  params: `0x${string}`;
}

export interface E3TallyResult {
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
}

export interface E3AuctionResult {
  winner: `0x${string}`;
  secondPriceBucket: number;
}

export interface EncryptedInput {
  data: `0x${string}`;
  proof: `0x${string}`;
}

export type E3Phase =
  | 'None'
  | 'Requested'
  | 'KeyPublished'
  | 'InputsReady'
  | 'Computing'
  | 'Complete';

export interface E3State {
  phase: E3Phase;
  ciphertextCount: number;
}
