/**
 * tree-utils.ts — Auction Merkle Tree Utilities
 *
 * Provides Merkle tree construction for Vickrey auction bidder eligibility.
 *
 * IMPORTANT: The NounsAuctionHouseV4 contract already tracks deposits on-chain
 * via `hasSubmittedSealedBid[nounId][bidder]` and `auctionBidders[nounId]`.
 * A Merkle tree is only needed when `bidderMerkleRoot != bytes32(0)` for
 * permissioned bidding mode. For open bidding (anyone with ETH can bid),
 * set `bidderMerkleRoot = bytes32(0)` and skip Merkle proofs entirely.
 */

import { ethers } from 'ethers';
import { buildMerkleTree as buildMerkleTreeBase, verifyProof, MerkleTree } from '../tree-utils';

export { verifyProof, MerkleTree };

export interface AuctionMerkleEntry {
  bidder: string;
  leaf: string;
  proof: string[];
}

/**
 * Compute Merkle leaf for a bidder.
 * Leaf = keccak256(abi.encodePacked(bidder))
 * Must match NounsAuctionHouseV4 on-chain leaf computation (line 146).
 */
export function computeAuctionLeaf(bidder: string): string {
  return ethers.utils.solidityKeccak256(['address'], [bidder]);
}

/**
 * Build a Merkle tree from a list of bidder addresses.
 * Returns the root and a proof map keyed by leaf hex.
 * Uses sorted-pair hashing to match OpenZeppelin's MerkleProof.verify.
 */
export function buildAuctionMerkleTree(
  bidders: string[],
): { root: string; proofs: Map<string, string[]>; leaves: string[] } {
  if (bidders.length === 0) {
    return { root: ethers.constants.HashZero, proofs: new Map(), leaves: [] };
  }

  // Auction leaves use keccak256(abi.encodePacked(bidder)), not
  // keccak256(abi.encodePacked(delegate, votingPower)), so we build manually.
  const leaves = bidders.map((bidder) => computeAuctionLeaf(bidder));

  const sortedLeaves = [...leaves].sort((a, b) =>
    a.toLowerCase() <= b.toLowerCase() ? -1 : 1,
  );

  // Build tree layers bottom-up
  function sortedPairHash(a: string, b: string): string {
    const [left, right] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
    return ethers.utils.keccak256(ethers.utils.concat([left, right]));
  }

  const layers: string[][] = [sortedLeaves];
  let current = sortedLeaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(sortedPairHash(current[i], current[i + 1]));
      } else {
        // Odd leaf: promote as-is
        next.push(current[i]);
      }
    }
    layers.push(next);
    current = next;
  }

  const root = current[0];

  // Generate proofs for each leaf
  const proofs = new Map<string, string[]>();
  for (const leaf of sortedLeaves) {
    const proof: string[] = [];
    let idx = sortedLeaves.indexOf(leaf);
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const layerNodes = layers[layer];
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (siblingIdx < layerNodes.length) {
        proof.push(layerNodes[siblingIdx]);
      }
      idx = Math.floor(idx / 2);
    }
    proofs.set(leaf, proof);
  }

  return { root, proofs, leaves: sortedLeaves };
}
