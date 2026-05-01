import React, { useState } from 'react';

import { CheckCircleIcon, XIcon } from '@heroicons/react/outline';
import { formatEther } from 'viem';

import { cn } from '@/lib/utils';

import { AuctionPhaseIndicator } from './AuctionPhaseIndicator';
import { useSealedBid } from './useSealedBid';

export interface SealedBidCardProps {
  nounId: bigint;
  auctionAddress: `0x${string}`;
  maxPriceWei: bigint;
  endTime: bigint;
  imageUrl?: string;
  className?: string;
}

export const SealedBidCard: React.FC<SealedBidCardProps> = ({
  nounId,
  auctionAddress,
  maxPriceWei,
  endTime,
  imageUrl,
  className,
}) => {
  const { placeBid, isPending, isSuccess, error } = useSealedBid({ nounId, auctionAddress });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceBucket, setPriceBucket] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePlaceBidClick = () => {
    setIsModalOpen(true);
  };

  const confirmBid = async () => {
    try {
      await placeBid(priceBucket, maxPriceWei);
      setIsModalOpen(false);
      setShowSuccess(true);
      setPriceBucket(0);
    } catch (e) {
      console.error('Failed to submit sealed bid:', e);
    }
  };

  const cancelBid = () => {
    setIsModalOpen(false);
    setPriceBucket(0);
  };

  const isBiddingEnded = Date.now() > Number(endTime) * 1000;

  return (
    <div className={cn('mt-6 flex flex-col rounded-lg border bg-white p-6 shadow-sm', className)}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-xl font-bold">Noun {nounId.toString()} - Sealed Bid Auction</h3>
          <p className="text-sm text-gray-500">
            Ends: {new Date(Number(endTime) * 1000).toLocaleString()}
          </p>
        </div>
        <AuctionPhaseIndicator nounId={nounId} />
      </div>

      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Noun ${nounId.toString()}`}
            className="h-32 w-32 rounded-lg bg-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-32 w-32 animate-pulse items-center justify-center rounded-lg bg-gray-200 text-gray-400">
            No Image
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center">
          <p className="mb-4 text-gray-600">
            Place a private bid. The amount is encrypted and will only be revealed during the
            computation phase. A collateral of {formatEther(maxPriceWei)} ETH is required and will
            be refunded if you don&apos;t win or if the winning price is lower.
          </p>
          <button
            type="button"
            onClick={handlePlaceBidClick}
            disabled={isPending || isBiddingEnded}
            className="bg-[var(--brand-color-green, #10b981)] self-start rounded border-none px-6 py-3 text-base font-bold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBiddingEnded ? 'Bidding Ended' : 'Place Sealed Bid'}
          </button>
        </div>
      </div>

      {showSuccess || isSuccess ? (
        <div className="flex items-start gap-3 rounded border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
          <div>
            <h4 className="font-semibold">Bid Submitted Successfully</h4>
            <p className="mt-1 text-sm">
              Your sealed bid has been submitted. Bid amount remains private.
            </p>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mt-4 break-words rounded border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          Failed to submit bid: {error.message || 'Unknown error'}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={cancelBid}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-6 w-6" />
            </button>

            <h4 className="mb-2 text-xl font-bold">Place Sealed Bid</h4>
            <p className="mb-6 text-sm text-gray-500">
              Choose your price bucket. Higher buckets represent higher bids.
            </p>

            <div className="mb-8">
              <div className="mb-2 flex justify-between">
                <span className="text-sm font-medium">Price Bucket</span>
                <span className="text-sm font-bold">{priceBucket} / 255</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={priceBucket}
                onChange={e => setPriceBucket(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="mb-1 font-medium">Required Deposit</p>
              <p>{formatEther(maxPriceWei)} ETH</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelBid}
                disabled={isPending}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBid}
                disabled={isPending}
                className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? (
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  'Submit Bid'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
