import { describe, expect, it } from 'vitest';

import {
  getLocalInterfoldAddresses,
  getSidecarAddress,
  getV4AuctionAddress,
} from '../local-interfold-addresses';

describe('local interfold addresses', () => {
  it('returns null for non-local chains', () => {
    expect(getLocalInterfoldAddresses(1)).toBeNull();
  });

  it('returns local addresses for hardhat', () => {
    const addresses = getLocalInterfoldAddresses(31337);

    expect(addresses).not.toBeNull();
    expect(addresses?.mockEnclave).toBeDefined();
  });

  it('returns undefined sidecar for non-local chains', () => {
    expect(getSidecarAddress(1)).toBeUndefined();
  });

  it('returns sidecar for hardhat', () => {
    expect(getSidecarAddress(31337)).toEqual(expect.stringMatching(/^0x/));
  });

  it('returns v4 auction proxy for hardhat', () => {
    expect(getV4AuctionAddress(31337)).toEqual(expect.stringMatching(/^0x/));
  });
});
