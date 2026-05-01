import { ethers } from 'ethers';

export interface MerkleEntry {
  delegate: string; // checksummed address
  votingPower: bigint;
  leaf: string; // hex bytes32
  proof: string[]; // hex bytes32[]
}

export interface MerkleTree {
  merkleRoot: string; // hex bytes32
  blockNumber: number;
  proposalId?: number;
  entries: MerkleEntry[];
}

/**
 * Compute Merkle leaf for a delegate.
 * Leaf = keccak256(abi.encodePacked(delegate, votingPower))
 * Must match CrispVotingSidecar on-chain leaf computation.
 */
export function computeLeaf(delegate: string, votingPower: bigint): string {
  return ethers.utils.solidityKeccak256(['address', 'uint96'], [delegate, votingPower]);
}

/**
 * Sort two 32-byte hex strings for sorted-pair hashing (matches OpenZeppelin MerkleProof).
 */
function sortedPairHash(a: string, b: string): string {
  const [left, right] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return ethers.utils.keccak256(ethers.utils.concat([left, right]));
}

/**
 * Build a Merkle tree from a list of (delegate, votingPower) entries.
 * Returns the root and a proof map keyed by leaf hex.
 * Uses sorted-pair hashing to match OpenZeppelin's MerkleProof.verify.
 */
export function buildMerkleTree(
  inputs: { delegate: string; votingPower: bigint }[],
): { root: string; proofs: Map<string, string[]>; leaves: string[] } {
  if (inputs.length === 0) {
    return { root: ethers.constants.HashZero, proofs: new Map(), leaves: [] };
  }

  // Compute leaves
  const leaves = inputs.map(({ delegate, votingPower }) => computeLeaf(delegate, votingPower));

  // Sort leaves for determinism
  const sortedLeaves = [...leaves].sort((a, b) => (a.toLowerCase() <= b.toLowerCase() ? -1 : 1));

  // Build tree layers bottom-up
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

/**
 * Verify a Merkle proof against a root.
 * Matches OpenZeppelin's MerkleProof.verify sorted-pair logic.
 */
export function verifyProof(root: string, leaf: string, proof: string[]): boolean {
  let computed = leaf;
  for (const sibling of proof) {
    computed = sortedPairHash(computed, sibling);
  }
  return computed.toLowerCase() === root.toLowerCase();
}
