import React from 'react';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/solid';

export interface E3TallyDisplayProps {
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumReached?: boolean;
  succeeded?: boolean;
}

export const E3TallyDisplay: React.FC<E3TallyDisplayProps> = ({
  forVotes,
  againstVotes,
  abstainVotes,
  quorumReached,
  succeeded,
}) => {
  const total = forVotes + againstVotes + abstainVotes;
  const forPct = total > 0 ? (forVotes / total) * 100 : 0;
  const againstPct = total > 0 ? (againstVotes / total) * 100 : 0;
  const abstainPct = total > 0 ? (abstainVotes / total) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-4 pb-4 pt-2">
      <div className="flex flex-col gap-2">
        <div className="flex h-4 w-full overflow-hidden rounded-md bg-[var(--brand-gray-light-text-translucent)]">
          {forPct > 0 && (
            <div className="h-full bg-[var(--brand-color-green)]" style={{ width: `${forPct}%` }} />
          )}
          {againstPct > 0 && (
            <div
              className="h-full bg-[var(--brand-color-red)]"
              style={{ width: `${againstPct}%` }}
            />
          )}
          {abstainPct > 0 && (
            <div
              className="h-full bg-[var(--brand-gray-light-text)]"
              style={{ width: `${abstainPct}%` }}
            />
          )}
        </div>

        <div className="flex justify-between px-1 text-sm font-medium">
          <div className="flex flex-col items-start">
            <span className="text-xs uppercase tracking-wider text-gray-500">For</span>
            <span className="text-lg font-bold text-[var(--brand-color-green)]">{forVotes}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-gray-500">Against</span>
            <span className="text-lg font-bold text-[var(--brand-color-red)]">{againstVotes}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wider text-gray-500">Abstain</span>
            <span className="text-lg font-bold text-[var(--brand-gray-light-text)]">
              {abstainVotes}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
        {quorumReached !== undefined && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {quorumReached ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Quorum reached</span>
              </>
            ) : (
              <>
                <XCircleIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">Quorum not reached</span>
              </>
            )}
          </div>
        )}

        {succeeded !== undefined && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {succeeded ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-green-700">Succeeded</span>
              </>
            ) : (
              <>
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Defeated</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
