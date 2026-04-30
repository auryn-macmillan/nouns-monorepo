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
  useChainId: vi.fn(() => 1),
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

describe('Auction Component - SealedBidCard Chain Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT render Sealed Bid Auction when chainId is 1', () => {
    vi.spyOn(interfoldConfig, 'getInterfoldConfig').mockReturnValue({
      enclaveAddress: '0x0000000000000000000000000000000000000000',
      isTestnet: false,
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
    expect(screen.queryByText('Sealed Bid Auction')).not.toBeInTheDocument();
  });
});
