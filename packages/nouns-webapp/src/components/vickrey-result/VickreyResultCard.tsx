import React from 'react';

import { UserIcon, XCircleIcon } from '@heroicons/react/solid';
import { formatEther } from 'viem';

import { Noun } from '@/components/Noun';
import { cn } from '@/lib/utils';
import { formatShortAddress } from '@/utils/addressAndENSDisplayUtils';

export interface VickreyResultCardProps {
  nounId: bigint;
  winner?: `0x${string}`;
  secondPrice?: bigint;
  totalBids?: bigint;
  zeroBids?: boolean;
  className?: string;
}

export const VickreyResultCard: React.FC<VickreyResultCardProps> = ({
  nounId,
  winner,
  secondPrice,
  totalBids,
  zeroBids,
  className,
}) => {
  if (zeroBids === true) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6',
          className,
        )}
      >
        <XCircleIcon className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">Noun burned — no bids</h3>
          <p className="mt-1 text-sm text-gray-500">
            This Noun received zero bids during the auction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row',
        className,
      )}
    >
      <div className="shrink-0">
        <Noun
          nounId={nounId}
          className="h-32 w-32 rounded-lg shadow-sm md:h-40 md:w-40"
          loadingNounFallback={true}
        />
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-gray-900">Noun {nounId.toString()}</h2>
          <div className="flex items-center gap-2 font-medium text-gray-500">
            <UserIcon className="h-4 w-4" />
            <span>Winner:</span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-900">
              {winner ? formatShortAddress(winner) : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="flex flex-col rounded-lg bg-[var(--brand-gray-light-text-translucent)] p-3">
            <span className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Second Price Paid
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">
                {secondPrice !== undefined ? formatEther(secondPrice) : '—'}
              </span>
              <span className="text-sm font-medium text-gray-500">ETH</span>
            </div>
          </div>

          <div className="flex flex-col rounded-lg bg-[var(--brand-gray-light-text-translucent)] p-3">
            <span className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Sealed Bids
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">
                {totalBids !== undefined ? totalBids.toString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
