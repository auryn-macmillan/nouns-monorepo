import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useAccount } from 'wagmi';

import { AuctionPhaseIndicator } from '../components/sealed-bid/AuctionPhaseIndicator';
import { SealedBidCard } from '../components/sealed-bid/SealedBidCard';
import { useSealedBid } from '../components/sealed-bid/useSealedBid';
import { useAuctionResult } from '../components/vickrey-result/useAuctionResult';
import { VickreyResultCard } from '../components/vickrey-result/VickreyResultCard';
import { VickreySettlement } from '../components/vickrey-result/VickreySettlement';
import { useE3AuctionState } from '../utils/interfold/interfold-hooks';

vi.mock('../components/sealed-bid/useSealedBid', () => ({
  useSealedBid: vi.fn(),
}));

vi.mock('../components/vickrey-result/useAuctionResult', () => ({
  useAuctionResult: vi.fn(),
}));

vi.mock('../utils/interfold/interfold-hooks', () => ({
  useE3AuctionState: vi.fn(),
}));

vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(),
  };
});

vi.mock('@/components/Noun', () => ({
  Noun: () => React.createElement('div', { 'data-testid': 'noun' }, 'Noun'),
}));

vi.mock('@/utils/addressAndENSDisplayUtils', () => ({
  formatShortAddress: (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
}));

const mockUseSealedBid = vi.mocked(useSealedBid);
const mockUseAuctionResult = vi.mocked(useAuctionResult);
const mockUseE3AuctionState = vi.mocked(useE3AuctionState);
const mockUseAccount = vi.mocked(useAccount);

describe('sealed bid and vickrey result', () => {
  let placeBidSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    placeBidSpy = vi.fn();
    mockUseSealedBid.mockReturnValue({
      placeBid: placeBidSpy,
      isPending: false,
      isSuccess: false,
      error: null,
    });
    mockUseAuctionResult.mockReturnValue({
      phase: 2,
      winner: '0x1234567890abcdef1234567890abcdef12345678',
      secondPrice: 2750000000000000000n,
      totalBids: 5n,
      zeroBids: false,
      settled: true,
      didBid: false,
      isLoading: false,
      isError: false,
    });
    mockUseE3AuctionState.mockReturnValue({
      data: { phase: 'None' } as never,
      isLoading: false,
    });
    mockUseAccount.mockReturnValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
    } as never);
  });

  test('SealedBidCard renders bid input and Place Sealed Bid button', () => {
    render(
      React.createElement(SealedBidCard, {
        nounId: 1n,
        auctionAddress: '0x0000000000000000000000000000000000000001',
        maxPriceWei: 1500000000000000000n,
        endTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Place Sealed Bid' }));

    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Bid' })).toBeInTheDocument();
  });

  test('SealedBidCard shows collateral deposit amount', () => {
    render(
      React.createElement(SealedBidCard, {
        nounId: 1n,
        auctionAddress: '0x0000000000000000000000000000000000000001',
        maxPriceWei: 2500000000000000000n,
        endTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Place Sealed Bid' }));

    expect(screen.getByText('Required Deposit')).toBeInTheDocument();
    expect(screen.getByText('2.5 ETH')).toBeInTheDocument();
  });

  test('VickreyResultCard shows winner and second price', () => {
    render(
      React.createElement(VickreyResultCard, {
        nounId: 1n,
        winner: '0x1234567890abcdef1234567890abcdef12345678',
        secondPrice: 2750000000000000000n,
        totalBids: 5n,
      }),
    );

    expect(screen.getByText('Noun 1')).toBeInTheDocument();
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('2.75')).toBeInTheDocument();
  });

  test('VickreySettlement shows Noun burned message for zero bids', () => {
    mockUseAuctionResult.mockReturnValueOnce({
      phase: 2,
      winner: undefined,
      secondPrice: undefined,
      totalBids: 0n,
      zeroBids: true,
      settled: true,
      didBid: false,
      isLoading: false,
      isError: false,
    });

    render(
      React.createElement(VickreySettlement, {
        nounId: 1n,
        auctionAddress: '0x0000000000000000000000000000000000000001',
      }),
    );

    expect(screen.getByText('Noun burned — no bids')).toBeInTheDocument();
    expect(
      screen.getByText('This Noun received zero bids during the auction.'),
    ).toBeInTheDocument();
  });

  test('AuctionPhaseIndicator shows correct phase labels', () => {
    const { rerender } = render(React.createElement(AuctionPhaseIndicator, { nounId: 1n }));

    const getLabels = () => [
      screen.getByText('Bidding'),
      screen.getByText('Computing'),
      screen.getByText('Revealed'),
    ];

    expect(getLabels()).toHaveLength(3);
    expect(screen.getByText('Bidding').className).toContain('bg-blue-100');

    mockUseE3AuctionState.mockReturnValue({
      data: { phase: 'Computing' } as never,
      isLoading: false,
    });
    rerender(React.createElement(AuctionPhaseIndicator, { nounId: 1n }));
    expect(screen.getByText('Computing').className).toContain('bg-blue-100');

    mockUseE3AuctionState.mockReturnValue({
      data: { phase: 'Complete' } as never,
      isLoading: false,
    });
    rerender(React.createElement(AuctionPhaseIndicator, { nounId: 1n }));
    expect(screen.getByText('Revealed').className).toContain('bg-blue-100');
  });
});
