import React from 'react';

import { cn } from '@/lib/utils';

import { useE3AuctionState } from '../../utils/interfold/interfold-hooks';

export interface AuctionPhaseIndicatorProps {
  nounId: bigint;
  className?: string;
}

export const AuctionPhaseIndicator: React.FC<AuctionPhaseIndicatorProps> = ({
  nounId,
  className,
}) => {
  const { data, isLoading } = useE3AuctionState(nounId);

  if (isLoading || !data) {
    return <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />;
  }

  const e3Phase = data.phase;

  let displayPhase: 'Bidding' | 'Computing' | 'Revealed' = 'Bidding';
  if (e3Phase === 'Computing') {
    displayPhase = 'Computing';
  } else if (e3Phase === 'Complete') {
    displayPhase = 'Revealed';
  }

  const phases = ['Bidding', 'Computing', 'Revealed'] as const;

  return (
    <div className={cn('flex items-center gap-2 text-sm font-medium', className)}>
      {phases.map((phase, index) => {
        const isActive = phase === displayPhase;
        const isPast = phases.indexOf(displayPhase) > index;

        return (
          <React.Fragment key={phase}>
            <div
              className={cn(
                'rounded-full border px-3 py-1 transition-colors',
                isActive
                  ? 'border-blue-300 bg-blue-100 text-blue-700'
                  : isPast
                    ? 'border-gray-200 bg-gray-100 text-gray-500'
                    : 'border-gray-200 bg-white text-gray-400',
              )}
            >
              {phase}
            </div>
            {index < phases.length - 1 && (
              <div className={cn('h-0.5 w-4', isPast ? 'bg-gray-300' : 'bg-gray-200')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
