import React from 'react';

import { cn } from '../../lib/utils';

import { E3TallyDisplay } from './E3TallyDisplay';

export interface E3ProposalStateProps {
  phase: 'None' | 'AcceptingInputs' | 'Computing' | 'Decrypted';
  isDefeated?: boolean;
  encryptedVoteCount?: number;
  tallyResult?: {
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
  };
}

export const E3ProposalState: React.FC<E3ProposalStateProps> = ({
  phase,
  isDefeated,
  encryptedVoteCount = 0,
  tallyResult,
}) => {
  if (phase === 'None') {
    return null;
  }

  if (isDefeated === true) {
    return (
      <div className={cn('flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4')}>
        <h3 className="font-bold text-red-800">E3 computation failed — proposal defeated</h3>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm',
      )}
    >
      {phase === 'AcceptingInputs' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
            </span>
            <h3 className="font-semibold text-gray-900">
              Voting in progress — {encryptedVoteCount} encrypted votes submitted
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Votes are encrypted. Tally will be revealed after voting closes.
          </p>
        </div>
      )}

      {phase === 'Computing' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <h3 className="font-semibold text-gray-900">FHE computation in progress...</h3>
          </div>
        </div>
      )}

      {phase === 'Decrypted' && tallyResult && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Tally revealed</h3>
          </div>
          <E3TallyDisplay
            forVotes={tallyResult.forVotes}
            againstVotes={tallyResult.againstVotes}
            abstainVotes={tallyResult.abstainVotes}
          />
        </div>
      )}
    </div>
  );
};
