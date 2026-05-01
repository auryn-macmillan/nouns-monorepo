import React from 'react';

import { InformationCircleIcon, CheckCircleIcon, CheckIcon } from '@heroicons/react/solid';
import { useAccount } from 'wagmi';

import { cn } from '@/lib/utils';
import { formatShortAddress } from '@/utils/addressAndENSDisplayUtils';

import { useAuctionResult } from './useAuctionResult';
import { VickreyResultCard } from './VickreyResultCard';

export interface VickreySettlementProps {
  nounId: bigint;
  auctionAddress: `0x${string}`;
  className?: string;
}

export const VickreySettlement: React.FC<VickreySettlementProps> = ({
  nounId,
  auctionAddress,
  className,
}) => {
  const { address } = useAccount();
  const { phase, winner, secondPrice, totalBids, zeroBids, settled, didBid, isLoading, isError } =
    useAuctionResult({ nounId, auctionAddress });

  if (isLoading === true) {
    return (
      <div
        className={cn(
          'flex animate-pulse items-center justify-center rounded-xl bg-gray-50 p-8',
          className,
        )}
      >
        <span className="font-medium text-gray-500">Loading auction data...</span>
      </div>
    );
  }

  if (isError === true) {
    return (
      <div className={cn('rounded-xl border border-red-200 bg-red-50 p-4 text-red-700', className)}>
        Failed to load auction result.
      </div>
    );
  }

  // Phase enum: 0 = Bidding, 1 = Computing, 2 = Revealed
  if (phase === 1 || phase === 0) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700',
          className,
        )}
      >
        <InformationCircleIcon className="h-6 w-6 shrink-0 text-blue-500" />
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight">Auction result being computed...</span>
          <p className="mt-1 text-sm opacity-90">
            E3 decryption is underway. Results will be shown here once revealed.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 2) {
    const isWinner =
      address !== undefined &&
      winner !== undefined &&
      address.toLowerCase() === winner.toLowerCase();

    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <VickreyResultCard
          nounId={nounId}
          winner={winner as `0x${string}` | undefined}
          secondPrice={secondPrice}
          totalBids={totalBids}
          zeroBids={zeroBids}
        />

        {settled === true && zeroBids !== true && (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-[var(--brand-gray-light-text-translucent)] p-5">
            <div className="flex items-center gap-2 font-bold text-[var(--brand-color-green)]">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Auction Settled</span>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <span className="font-medium">Noun transferred to:</span>
              <span className="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-sm shadow-sm">
                {winner ? formatShortAddress(winner) : 'Unknown'}
              </span>
            </div>

            {didBid === true && !isWinner && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-green-200/50 bg-green-50 p-3 text-sm text-gray-700">
                <CheckIcon className="h-5 w-5 shrink-0 text-[var(--brand-color-green)]" />
                <span className="font-medium">Your deposit has been refunded.</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};
