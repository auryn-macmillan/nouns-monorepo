import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { E3TallyDisplay } from '../components/e3-proposal/E3TallyDisplay';
import { E3VoteCard } from '../components/e3-vote/E3VoteCard';
import { E3VotingStatus } from '../components/e3-vote/E3VotingStatus';
import { useE3Vote } from '../components/e3-vote/useE3Vote';

vi.mock('../components/e3-vote/useE3Vote', () => ({
  useE3Vote: vi.fn(),
}));

vi.mock('../components/e3-proposal/useE3ProposalState', () => ({
  useE3ProposalState: vi.fn(),
}));

const mockUseE3Vote = vi.mocked(useE3Vote);

describe('e3 voting', () => {
  let castVoteSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    castVoteSpy = vi.fn().mockResolvedValue(undefined);
    const mockValue = {
      castVote: castVoteSpy,
      isPending: false,
      isSuccess: false,
      error: null,
    } satisfies ReturnType<typeof useE3Vote>;

    mockUseE3Vote.mockReturnValue(mockValue);
  });

  test('E3VoteCard renders FOR/AGAINST/ABSTAIN buttons when active', () => {
    render(
      React.createElement(E3VoteCard, {
        proposalId: 1n,
        sidecarAddress: '0x0000000000000000000000000000000000000001',
        isActive: true,
      }),
    );

    expect(screen.getByRole('button', { name: 'For' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Against' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abstain' })).toBeInTheDocument();
  });

  test('E3VoteCard shows Cast Secret Vote button', async () => {
    render(
      React.createElement(E3VoteCard, {
        proposalId: 1n,
        sidecarAddress: '0x0000000000000000000000000000000000000001',
        isActive: true,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'For' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(castVoteSpy).toHaveBeenCalledWith(1));
  });

  test('E3TallyDisplay shows vote counts after decryption', () => {
    render(
      React.createElement(E3TallyDisplay, {
        forVotes: 12,
        againstVotes: 8,
        abstainVotes: 4,
        quorumReached: true,
        succeeded: true,
      }),
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Quorum reached')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  test('E3VotingStatus shows phase indicators', () => {
    const { rerender } = render(
      React.createElement(E3VotingStatus, { phase: 'AcceptingInputs', encryptedVoteCount: 3 }),
    );

    expect(screen.getByText('Accepting Votes')).toBeInTheDocument();
    expect(screen.getByText('Encrypted Votes Cast:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(React.createElement(E3VotingStatus, { phase: 'Computing' }));
    expect(screen.getByText('Computing Results')).toBeInTheDocument();

    rerender(React.createElement(E3VotingStatus, { phase: 'Decrypted' }));
    expect(screen.getByText('Decrypted')).toBeInTheDocument();
  });

  test('E3VoteCard hides vote UI when inactive', () => {
    const { container } = render(
      React.createElement(E3VoteCard, {
        proposalId: 1n,
        sidecarAddress: '0x0000000000000000000000000000000000000001',
        isActive: false,
      }),
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: 'For' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Against' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abstain' })).not.toBeInTheDocument();
  });
});
