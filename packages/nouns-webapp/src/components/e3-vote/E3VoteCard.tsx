import React, { useState } from 'react';

import { useE3Vote } from './useE3Vote';

export interface E3VoteCardProps {
  proposalId: bigint;
  sidecarAddress: `0x${string}`;
  isActive: boolean;
}

export const E3VoteCard: React.FC<E3VoteCardProps> = ({ proposalId, sidecarAddress, isActive }) => {
  const { castVote, isPending, error } = useE3Vote({ proposalId, sidecarAddress });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voteChoice, setVoteChoice] = useState<0 | 1 | 2 | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVoteClick = (choice: 0 | 1 | 2) => {
    setVoteChoice(choice);
    setIsModalOpen(true);
  };

  const confirmVote = async () => {
    if (voteChoice === null) return;
    try {
      await castVote(voteChoice);
      setIsModalOpen(false);
      setShowSuccess(true);
      setVoteChoice(null);
    } catch (e) {
      console.error('Failed to cast E3 vote:', e);
      setIsModalOpen(false);
    }
  };

  const cancelVote = () => {
    setIsModalOpen(false);
    setVoteChoice(null);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-bold">Cast Secret Vote</h3>
      <p className="mb-6 text-sm text-gray-600">
        This proposal uses secret ballot voting. Your vote choice is encrypted on your device and
        only decrypted collectively once the voting period ends.
      </p>

      {showSuccess && (
        <div className="mb-4 rounded border border-green-200 bg-green-100 p-3 text-center font-medium text-green-800">
          Your encrypted vote has been submitted. Individual choices remain private until tally.
        </div>
      )}

      {error && (
        <div className="mb-4 break-words rounded border border-red-200 bg-red-100 p-3 text-center font-medium text-red-800">
          Failed to cast vote: {error.message || 'Unknown error'}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => handleVoteClick(1)}
          disabled={isPending}
          className="flex-1 rounded border-none bg-green-500 p-3 text-lg font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
        >
          For
        </button>
        <button
          type="button"
          onClick={() => handleVoteClick(0)}
          disabled={isPending}
          className="flex-1 rounded border-none bg-red-500 p-3 text-lg font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          Against
        </button>
        <button
          type="button"
          onClick={() => handleVoteClick(2)}
          disabled={isPending}
          className="flex-1 rounded border-none bg-gray-400 p-3 text-lg font-bold text-white transition-colors hover:bg-gray-500 disabled:opacity-50"
        >
          Abstain
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h4 className="mb-4 text-xl font-bold">Confirm Vote</h4>
            <p className="mb-6">
              You are about to cast a secret vote for:
              <span className="ml-1 font-bold">
                {voteChoice === 1 ? 'For' : voteChoice === 0 ? 'Against' : 'Abstain'}
              </span>
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={cancelVote}
                disabled={isPending}
                className="flex-1 rounded bg-gray-200 p-2 font-medium text-gray-800 transition-colors hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmVote}
                disabled={isPending}
                className="flex flex-1 items-center justify-center rounded bg-blue-500 p-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
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
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
