import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
// eslint-disable-next-line no-restricted-imports
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import Auction from '../index';
import * as interfoldConfig from '@/utils/interfold/interfold-config';

import { Auction as IAuction } from '@/wrappers/nounsAuction';

vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 31337),
}));

vi.mock('@/components/sealed-bid/SealedBidCard', () => ({
  SealedBidCard: () => <div>Sealed Bid Auction</div>,
}));

vi.mock('@/components/AuctionActivity', () => ({
  default: () => <div>Standard Auction</div>,
}));

vi.mock('@/components/StandaloneNoun', () => ({
  StandaloneNounWithSeed: () => <div>Noun Image</div>,
}));

vi.mock('@/components/NounderNounContent', () => ({
  default: () => <div>Nounder Content</div>,
}));

const createMockStore = () => configureStore({
  reducer: {
    application: () => ({ stateBackgroundColor: '#ffffff' }),
    onDisplayAuction: () => ({ lastAuctionNounId: 2 }),
  },
});

describe('Auction Component - SealedBidCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both Standard Auction and Sealed Bid Auction when chainId=31337 and v4AuctionAddress is present', () => {
    vi.spyOn(interfoldConfig, 'getInterfoldConfig').mockReturnValue({
      enclaveAddress: '0x0000000000000000000000000000000000000001',
      v4AuctionAddress: '0xabcd000000000000000000000000000000000000',
      isTestnet: true,
    });

    const mockAuction = {
      nounId: 1n,
      endTime: 9999999999,
      startTime: 9999999000,
    } as unknown as IAuction;

    render(
      <Provider store={createMockStore()}>
        <MemoryRouter>
          <Auction auction={mockAuction} />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Standard Auction')).toBeInTheDocument();
    expect(screen.getByText('Sealed Bid Auction')).toBeInTheDocument();
  });
});
