import type { EncryptedInput, E3TallyResult, E3AuctionResult } from './enclave-sdk-stub';
import type { InterfoldConfig } from './interfold-config';

import { decodeAbiParameters, encodeAbiParameters } from 'viem';

export class E3Client {
  private readonly config: InterfoldConfig;

  constructor(config: InterfoldConfig) {
    this.config = config;
  }

  async encryptVote(
    support: 0 | 1 | 2,
    votingPower: bigint,
    publicKey: `0x${string}`,
  ): Promise<EncryptedInput> {
    void publicKey;
    const data = encodeAbiParameters(
      [{ type: 'uint8' }, { type: 'uint256' }] as const,
      [BigInt(support) as unknown as number, votingPower] as const,
    );
    return {
      data,
      proof: '0x',
    };
  }

  async encryptBid(priceBucket: number, publicKey: `0x${string}`): Promise<EncryptedInput> {
    void publicKey;
    const data = encodeAbiParameters([{ type: 'uint256' }], [BigInt(priceBucket)]);
    return {
      data,
      proof: '0x',
    };
  }

  decryptVote(data: string): { support: number; votingPower: bigint } {
    const result = decodeAbiParameters(
      [{ type: 'uint8' }, { type: 'uint256' }],
      data as `0x${string}`,
    );

    return {
      support: Number(result[0]),
      votingPower: result[1],
    };
  }

  decryptBid(data: string): { priceBucket: bigint } {
    const result = decodeAbiParameters([{ type: 'uint256' }], data as `0x${string}`);

    return {
      priceBucket: result[0],
    };
  }

  async awaitPhase(): Promise<void> {
    return;
  }

  getEnclaveAddress(): `0x${string}` {
    return this.config.enclaveAddress;
  }
}

export type { E3TallyResult, E3AuctionResult, EncryptedInput };
