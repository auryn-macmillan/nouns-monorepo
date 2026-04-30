import { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VotePage from '../index';

vi.mock('@/components/e3-vote/E3VoteCard', () => ({
  E3VoteCard: () => <div data-testid="e3-vote-card">Cast Secret Vote</div>,
}));

vi.mock('wagmi', async importOriginal => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: () => ({ address: '0x123' }),
    useBlockNumber: () => ({ data: 10n }),
    useChainId: () => 1,
  };
});

vi.mock('@/utils/interfold/interfold-config', () => ({
  getInterfoldConfig: () => ({
    sidecarAddress: '0xsidecar',
    isTestnet: false,
    enclaveAddress: '0x0',
  }),
}));

vi.mock('react-router', () => ({
  useParams: () => ({ id: '1' }),
  Link: ({ children }: { children: ReactNode }) => <a data-testid="link">{children}</a>,
}));

vi.mock('@apollo/client', () => ({
  useQuery: () => ({
    data: { proposal: { quorumCoefficient: '0' }, votes: [] },
    loading: false,
    error: null,
  }),
}));

vi.mock('@lingui/react', () => ({
  useLingui: () => ({ _: (str: string) => str }),
}));
vi.mock('@lingui/core/macro', () => ({
  t: (str: string) => str,
}));
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@lingui/core', () => ({
  i18n: { date: () => 'Date', number: (n: number) => String(n) },
}));

vi.mock('@/hooks', () => ({
  useAppSelector: () => '0x123',
}));

vi.mock('@/wrappers/nounsDao', () => ({
  ProposalState: { ACTIVE: 1, UPDATABLE: 2 },
  useProposal: () => ({
    id: '1',
    status: 1,
    startBlock: 0n,
    endBlock: 100n,
    forCount: 0,
    againstCount: 0,
    abstainCount: 0,
    quorumVotes: 10,
    description: 'Test',
    title: 'Test Prop',
    details: [],
  }),
  useProposalVersions: () => [],
  useQueueProposal: () => ({ queueProposal: vi.fn(), queueProposalState: { status: 'None' } }),
  useExecuteProposal: () => ({
    executeProposal: vi.fn(),
    executeProposalState: { status: 'None' },
  }),
  useCancelProposal: () => ({ cancelProposal: vi.fn(), cancelProposalState: { status: 'None' } }),
  useIsDaoGteV3: () => true,
  useIsForkActive: () => ({ data: false }),
  useHasVotedOnProposal: () => false,
}));

vi.mock('@/wrappers/subgraph', () => ({
  propUsingDynamicQuorum: () => ({ query: {}, variables: {} }),
  proposalVotesQuery: () => ({ query: {}, variables: {} }),
  delegateNounsAtBlockQuery: () => ({ query: {}, variables: {} }),
}));

vi.mock('@/wrappers/nounsData', () => ({
  useProposalFeedback: () => ({ data: [], refetch: vi.fn() }),
}));

vi.mock('@/wrappers/nounToken', () => ({
  useUserVotesAsOfBlock: () => 1,
  useUserVotes: () => 1,
}));

vi.mock('@/contracts', () => ({
  useReadNounsGovernorQuorumVotes: () => ({ data: 10n }),
}));

vi.mock('@/hooks/useActivateLocale', () => ({
  useActiveLocale: () => 'en',
}));

vi.mock('@/components/VoteCard', () => ({
  default: () => <div data-testid="vote-card">VoteCard</div>,
  VoteCardVariant: { FOR: 'FOR', AGAINST: 'AGAINST', ABSTAIN: 'ABSTAIN' },
}));
vi.mock('@/components/ProposalContent', () => ({ default: () => <div /> }));
vi.mock('@/components/ProposalHeader', () => ({ default: () => <div /> }));
vi.mock('@/components/VoteModal', () => ({ default: () => <div /> }));
vi.mock('@/components/StreamWithdrawModal', () => ({ default: () => <div /> }));
vi.mock('@/components/DynamicQuorumInfoModal', () => ({ default: () => <div /> }));

describe('E3VoteCard Chain Guard in VotePage', () => {
  it('does not render E3VoteCard when chainId is 1', () => {
    render(<VotePage />);
    expect(screen.queryByTestId('e3-vote-card')).toBeNull();
    expect(screen.queryByText('Cast Secret Vote')).toBeNull();
  });
});
