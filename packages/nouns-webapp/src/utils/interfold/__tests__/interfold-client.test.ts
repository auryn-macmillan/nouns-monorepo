import { describe, expect, it } from 'vitest';

import { E3Client } from '../interfold-client';

const client = new E3Client({
  enclaveAddress: '0x0000000000000000000000000000000000000001',
  isTestnet: true,
});

describe('E3Client', () => {
  it('encryptVote returns abi encoded data', async () => {
    const result = await client.encryptVote(1, 1n, '0x');

    expect(result.data).toMatch(/^0x/);
    expect(result.data.length).toBeGreaterThan(4);
    expect(result.proof).toBe('0x');
  });

  it('encryptBid returns abi encoded data', async () => {
    const result = await client.encryptBid(100, '0x');

    expect(result.data).toMatch(/^0x/);
    expect(result.data.length).toBeGreaterThan(4);
    expect(result.proof).toBe('0x');
  });

  it('round trips vote encryption', async () => {
    const encrypted = await client.encryptVote(1, 5n, '0x');

    expect(client.decryptVote(encrypted.data)).toEqual({
      support: 1,
      votingPower: 5n,
    });
  });

  it('round trips bid encryption', async () => {
    const encrypted = await client.encryptBid(128, '0x');

    expect(client.decryptBid(encrypted.data)).toEqual({
      priceBucket: 128n,
    });
  });
});
