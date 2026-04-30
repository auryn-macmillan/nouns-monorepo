import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useE3VotingState, useE3AuctionState } from '../interfold-hooks';

vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 31337),
  useReadContract: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('../interfold-config', () => ({
  getInterfoldConfig: vi.fn(() => ({
    enclaveAddress: '0x0000000000000000000000000000000000000001',
    sidecarAddress: '0x0000000000000000000000000000000000000002',
    v4AuctionAddress: '0x0000000000000000000000000000000000000003',
  })),
}));

vi.mock('@/contracts/crisp-voting-sidecar.gen', () => ({
  crispVotingSidecarAbi: [],
}));

vi.mock('@/contracts/mock-enclave.gen', () => ({
  mockEnclaveAbi: [],
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('interfold-hooks on-chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useE3VotingState returns KeyPublished phase when sidecar returns phase=2', async () => {
    const { useReadContract } = await import('wagmi');
    vi.mocked(useReadContract).mockReturnValue({
      data: [
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        2,
        0n,
        0n,
        0n,
      ] as unknown as undefined,
      isLoading: false,
    } as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useE3VotingState(1n), { wrapper });
    expect(result.current.data?.phase).toBe('KeyPublished');
    expect(result.current.data?.e3Id).not.toBeNull();
  });

  it('useE3VotingState returns safe defaults for chainId=1', async () => {
    const { useChainId, useReadContract } = await import('wagmi');
    vi.mocked(useChainId).mockReturnValue(1);
    vi.mocked(useReadContract).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useE3VotingState(1n), { wrapper });
    expect(result.current.data?.phase).toBe('None');
    expect(result.current.data?.e3Id).toBeNull();
  });

  it('useE3AuctionState returns KeyPublished phase when MockEnclave returns phase=2', async () => {
    const { useChainId, useReadContract } = await import('wagmi');
    vi.mocked(useChainId).mockReturnValue(31337);
    vi.mocked(useReadContract).mockReturnValue({
      data: 2n as unknown as undefined,
      isLoading: false,
    } as ReturnType<typeof useReadContract>);

    const { result } = renderHook(() => useE3AuctionState(1n), { wrapper });
    expect(result.current.data?.phase).toBe('KeyPublished');
  });
});
