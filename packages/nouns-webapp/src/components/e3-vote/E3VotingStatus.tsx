import React from 'react';

import { cn } from '@/lib/utils';

export interface E3VotingStatusProps {
  phase: 'None' | 'AcceptingInputs' | 'Computing' | 'Decrypted';
  encryptedVoteCount?: number;
}

export const E3VotingStatus: React.FC<E3VotingStatusProps> = ({ phase, encryptedVoteCount }) => {
  return (
    <div className={cn('rounded-lg border p-4', getPhaseColor(phase))}>
      <h3 className="mb-2 text-lg font-semibold">Secret Ballot Status</h3>
      <div className="flex flex-col gap-1">
        <p>
          Phase: <span className="font-medium">{formatPhase(phase)}</span>
        </p>
        {encryptedVoteCount !== undefined && (
          <p>
            Encrypted Votes Cast: <span className="font-medium">{encryptedVoteCount}</span>
          </p>
        )}
      </div>
    </div>
  );
};

function getPhaseColor(phase: E3VotingStatusProps['phase']): string {
  switch (phase) {
    case 'AcceptingInputs':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'Computing':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'Decrypted':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'None':
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
}

function formatPhase(phase: E3VotingStatusProps['phase']): string {
  switch (phase) {
    case 'None':
      return 'Not Started';
    case 'AcceptingInputs':
      return 'Accepting Votes';
    case 'Computing':
      return 'Computing Results';
    case 'Decrypted':
      return 'Decrypted';
    default:
      return phase;
  }
}
