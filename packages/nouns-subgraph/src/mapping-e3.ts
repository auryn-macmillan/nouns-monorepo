import { Bytes, BigInt } from '@graphprotocol/graph-ts';

import {
  E3VoteInitialized,
  E3VoteCast,
  E3TallyDecrypted,
  E3VoteDecayed,
} from './types/CrispVotingSidecar/CrispVotingSidecar';
import { E3Proposal, E3VoteSubmission, E3TallyResult, Proposal } from './types/schema';

function getOrCreateE3Proposal(proposalId: string): E3Proposal {
  let e3Proposal = E3Proposal.load(proposalId);
  if (e3Proposal == null) {
    e3Proposal = new E3Proposal(proposalId);
    e3Proposal.e3Id = Bytes.empty();
    e3Proposal.merkleRoot = Bytes.empty();
    e3Proposal.votingPhase = 'AcceptingInputs';
    e3Proposal.forVotes = BigInt.fromI32(0);
    e3Proposal.againstVotes = BigInt.fromI32(0);
    e3Proposal.abstainVotes = BigInt.fromI32(0);
    e3Proposal.encryptedVoteCount = BigInt.fromI32(0);
    // Ensure the Proposal entity exists; if not, create a stub
    let proposal = Proposal.load(proposalId);
    if (proposal == null) {
      proposal = new Proposal(proposalId);
      proposal.proposer = Bytes.empty().toHex();
      proposal.signers = null;
      proposal.targets = [];
      proposal.values = [];
      proposal.signatures = [];
      proposal.calldatas = [];
      proposal.createdTimestamp = BigInt.fromI32(0);
      proposal.createdBlock = BigInt.fromI32(0);
      proposal.lastUpdatedTimestamp = BigInt.fromI32(0);
      proposal.lastUpdatedBlock = BigInt.fromI32(0);
      proposal.createdTransactionHash = Bytes.empty();
      proposal.lastUpdatedTransactionHash = Bytes.empty();
      proposal.startBlock = BigInt.fromI32(0);
      proposal.endBlock = BigInt.fromI32(0);
      proposal.forVotes = BigInt.fromI32(0);
      proposal.againstVotes = BigInt.fromI32(0);
      proposal.abstainVotes = BigInt.fromI32(0);
      proposal.title = '';
      proposal.description = '';
      proposal.totalSupply = BigInt.fromI32(0);
      proposal.adjustedTotalSupply = BigInt.fromI32(0);
      proposal.minQuorumVotesBPS = 0;
      proposal.maxQuorumVotesBPS = 0;
      proposal.quorumCoefficient = BigInt.fromI32(0);
      proposal.objectionPeriodEndBlock = BigInt.fromI32(0);
      proposal.voteSnapshotBlock = BigInt.fromI32(0);
      proposal.clientId = 0;
      proposal.save();
    }
    e3Proposal.proposal = proposalId;
  }
  return e3Proposal as E3Proposal;
}

export function handleE3VoteInitialized(event: E3VoteInitialized): void {
  const proposalId = event.params.proposalId.toString();
  const e3Proposal = getOrCreateE3Proposal(proposalId);

  e3Proposal.e3Id = event.params.e3Id;
  e3Proposal.merkleRoot = event.params.merkleRoot;
  e3Proposal.votingPhase = 'AcceptingInputs';
  e3Proposal.encryptedVoteCount = BigInt.fromI32(0);
  e3Proposal.save();
}

export function handleE3VoteCast(event: E3VoteCast): void {
  const proposalId = event.params.proposalId.toString();
  const e3Proposal = getOrCreateE3Proposal(proposalId);

  e3Proposal.encryptedVoteCount = e3Proposal.encryptedVoteCount.plus(BigInt.fromI32(1));
  e3Proposal.save();

  // Create E3VoteSubmission entity — no vote choice stored (privacy by design)
  const submissionId = event.transaction.hash.toHex() + '-' + event.logIndex.toString();
  const submission = new E3VoteSubmission(submissionId);
  submission.proposal = proposalId;
  submission.voter = event.params.voter;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.save();
}

export function handleE3TallyDecrypted(event: E3TallyDecrypted): void {
  const proposalId = event.params.proposalId.toString();
  const e3Proposal = getOrCreateE3Proposal(proposalId);

  e3Proposal.votingPhase = 'Decrypted';
  e3Proposal.forVotes = event.params.forVotes;
  e3Proposal.againstVotes = event.params.againstVotes;
  e3Proposal.abstainVotes = event.params.abstainVotes;
  e3Proposal.save();

  const tallyResult = new E3TallyResult(proposalId);
  tallyResult.proposal = proposalId;
  tallyResult.forVotes = e3Proposal.forVotes;
  tallyResult.againstVotes = e3Proposal.againstVotes;
  tallyResult.abstainVotes = e3Proposal.abstainVotes;

  // Quorum/success heuristic — production deployment should use governor's actual quorum calculation
  const totalVotes = tallyResult.forVotes
    .plus(tallyResult.againstVotes)
    .plus(tallyResult.abstainVotes);
  tallyResult.quorumReached = totalVotes.gt(BigInt.fromI32(0));
  tallyResult.succeeded = tallyResult.forVotes.gt(tallyResult.againstVotes);
  tallyResult.decryptedAt = event.block.timestamp;
  tallyResult.save();

  e3Proposal.tallyResult = proposalId;
  e3Proposal.save();
}

export function handleE3VoteDecayed(event: E3VoteDecayed): void {
  const proposalId = event.params.proposalId.toString();
  const e3Proposal = getOrCreateE3Proposal(proposalId);

  e3Proposal.votingPhase = 'Defeated';
  e3Proposal.forVotes = BigInt.fromI32(0);
  e3Proposal.againstVotes = BigInt.fromI32(0);
  e3Proposal.abstainVotes = BigInt.fromI32(0);
  e3Proposal.save();
}
