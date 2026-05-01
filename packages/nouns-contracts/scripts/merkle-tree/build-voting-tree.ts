/**
 * build-voting-tree.ts
 *
 * CLI script to build a delegation-aware Merkle tree for Nouns DAO E3 voting.
 *
 * Usage:
 *   npx ts-node scripts/merkle-tree/build-voting-tree.ts \
 *     --block <blockNumber> \
 *     --output <outputPath> \
 *     [--rpc <rpcUrl>] \
 *     [--token <nounsTokenAddress>]
 *
 * Environment variables (fallbacks):
 *   NOUNS_TOKEN_ADDRESS  — NounsToken contract address
 *   RPC_URL              — JSON-RPC endpoint (default: http://localhost:8545)
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { buildMerkleTree, computeLeaf, verifyProof, MerkleTree } from './tree-utils';

// Minimal ABI for NounsToken delegation queries
const NOUNS_TOKEN_ABI = [
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function delegates(address account) view returns (address)',
  'function getPriorVotes(address account, uint256 blockNumber) view returns (uint96)',
];

function parseArgs(): { block: number; output: string; rpc: string; token: string } {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback = '') => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const block = parseInt(get('--block', '0'), 10);
  if (!block) {
    console.error('Error: --block <blockNumber> is required');
    process.exit(1);
  }

  const output = get('--output', `output/tree-${block}.json`);
  const rpc = get('--rpc', process.env.RPC_URL || 'http://localhost:8545');
  const token = get('--token', process.env.NOUNS_TOKEN_ADDRESS || '');

  if (!token) {
    console.error('Error: --token <address> or NOUNS_TOKEN_ADDRESS env var is required');
    process.exit(1);
  }

  return { block, output, rpc, token };
}

async function main() {
  const { block, output, rpc, token } = parseArgs();

  console.log(`Building Merkle tree at block ${block}...`);
  console.log(`NounsToken: ${token}`);
  console.log(`RPC: ${rpc}`);

  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const nounsToken = new ethers.Contract(token, NOUNS_TOKEN_ABI, provider);

  // 1. Get total supply
  const totalSupply: ethers.BigNumber = await nounsToken.totalSupply();
  console.log(`Total supply: ${totalSupply.toString()} Nouns`);

  // 2. Collect all owners and their delegates at snapshot block
  const delegateVotingPower = new Map<string, bigint>();

  console.log('Fetching token owners and delegates...');
  const batchSize = 50;
  for (let i = 0; i < totalSupply.toNumber(); i += batchSize) {
    const end = Math.min(i + batchSize, totalSupply.toNumber());
    const batch = Array.from({ length: end - i }, (_, j) => i + j);

    await Promise.all(
      batch.map(async tokenId => {
        try {
          const owner: string = await nounsToken.ownerOf(tokenId);
          const delegate: string = await nounsToken.delegates(owner);
          const checksumDelegate = ethers.utils.getAddress(delegate);

          // Use getPriorVotes for historical snapshot
          const votes: ethers.BigNumber = await nounsToken.getPriorVotes(checksumDelegate, block);
          if (votes.gt(0)) {
            const existing = delegateVotingPower.get(checksumDelegate) ?? 0n;
            // getPriorVotes already returns total delegated power — don't double-count
            delegateVotingPower.set(checksumDelegate, BigInt(votes.toString()));
          }
        } catch {
          // Token may have been burned; skip
        }
      }),
    );

    if ((i / batchSize) % 10 === 0) {
      console.log(`  Processed ${end}/${totalSupply.toString()} tokens...`);
    }
  }

  // 3. Filter zero-power delegates (already filtered above, but be explicit)
  const entries = Array.from(delegateVotingPower.entries())
    .filter(([, power]) => power > 0n)
    .map(([delegate, votingPower]) => ({ delegate, votingPower }));

  console.log(`Found ${entries.length} eligible delegates`);

  if (entries.length === 0) {
    console.error('No eligible delegates found. Exiting.');
    process.exit(1);
  }

  // 4. Build Merkle tree
  const { root, proofs, leaves } = buildMerkleTree(entries);
  console.log(`Merkle root: ${root}`);

  // 5. Assemble output
  const treeOutput: MerkleTree = {
    merkleRoot: root,
    blockNumber: block,
    entries: entries.map(({ delegate, votingPower }) => {
      const leaf = computeLeaf(delegate, votingPower);
      const proof = proofs.get(leaf) ?? [];
      return {
        delegate,
        votingPower,
        leaf,
        proof,
      };
    }),
  };

  // 6. Verify all proofs
  let allValid = true;
  for (const entry of treeOutput.entries) {
    if (!verifyProof(root, entry.leaf, entry.proof)) {
      console.error(`Invalid proof for delegate ${entry.delegate}`);
      allValid = false;
    }
  }
  if (!allValid) {
    console.error('Some proofs are invalid. Aborting.');
    process.exit(1);
  }
  console.log('All proofs verified ✓');

  // 7. Write output
  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Serialize bigint as string for JSON
  const serialized = JSON.stringify(
    treeOutput,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  );
  fs.writeFileSync(output, serialized);
  console.log(`Tree written to ${output}`);
  console.log(`merkleRoot: ${root}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
