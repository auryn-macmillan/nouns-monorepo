import { describe, expect, it, vi } from 'vitest';

import addresses from '../../../contracts/addresses.local.json';
import { getInterfoldConfig } from '../interfold-config';

describe('getInterfoldConfig', () => {
  it('returns the local mockEnclave address when non-zero', () => {
    expect(getInterfoldConfig(31337).enclaveAddress).toBe(addresses.mockEnclave as `0x${string}`);
  });

  it('returns the fallback enclave address when local mockEnclave is zero', async () => {
    vi.resetModules();
    vi.doMock('../../../contracts/addresses.local.json', () => ({
      default: {
        mockEnclave: '0x0000000000000000000000000000000000000000',
      },
    }));

    const { getInterfoldConfig: getMockedInterfoldConfig } = await import('../interfold-config');

    expect(getMockedInterfoldConfig(31337).enclaveAddress).toBe(
      '0x0000000000000000000000000000000000000001',
    );

    vi.doUnmock('../../../contracts/addresses.local.json');
    vi.resetModules();
  });

  it('returns the zero address for mainnet', () => {
    expect(getInterfoldConfig(1).enclaveAddress).toBe('0x0000000000000000000000000000000000000000');
  });

  it('includes the local sidecar and v4 auction addresses on chain 31337', () => {
    const config = getInterfoldConfig(31337);

    expect(config.sidecarAddress).toBeDefined();
    expect(config.v4AuctionAddress).toBeDefined();
  });
});
