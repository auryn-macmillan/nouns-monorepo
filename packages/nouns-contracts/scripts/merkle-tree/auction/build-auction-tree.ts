/**
 * build-auction-tree.ts
 *
 * CLI script to build a Merkle tree for Vickrey auction bidder eligibility.
 *
 * Usage:
 *   npx ts-node scripts/merkle-tree/auction/build-auction-tree.ts \
 *     --input <inputPath> \
 *     --output <outputPath>
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildAuctionMerkleTree,
  computeAuctionLeaf,
  verifyProof,
  AuctionMerkleEntry,
} from './tree-utils';

interface AuctionTreeOutput {
  merkleRoot: string;
  bidders: string[];
  entries: AuctionMerkleEntry[];
}

function parseArgs(): { input: string; output: string } {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback = '') => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const input = get('--input');
  if (!input) {
    console.error('Error: --input <path> is required');
    process.exit(1);
  }

  const output = get('--output', 'output/auction-tree.json');
  return { input, output };
}

function readBidders(inputPath: string): string[] {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Input JSON must be an array of bidder addresses');
  }

  return parsed.map((bidder, index) => {
    if (typeof bidder !== 'string') {
      throw new Error(`Bidder at index ${index} must be a string`);
    }
    return ethers.utils.getAddress(bidder);
  });
}

async function main() {
  const { input, output } = parseArgs();

  console.log(`Reading bidders from ${input}...`);
  const bidders = readBidders(input);
  console.log(`Loaded ${bidders.length} bidders`);

  const { root, proofs } = buildAuctionMerkleTree(bidders);
  console.log(`Merkle root: ${root}`);

  const treeOutput: AuctionTreeOutput = {
    merkleRoot: root,
    bidders,
    entries: bidders.map(bidder => {
      const leaf = computeAuctionLeaf(bidder);
      const proof = proofs.get(leaf) ?? [];
      return { bidder, leaf, proof };
    }),
  };

  let allValid = true;
  for (const entry of treeOutput.entries) {
    if (!verifyProof(root, entry.leaf, entry.proof)) {
      console.error(`Invalid proof for bidder ${entry.bidder}`);
      allValid = false;
    }
  }

  if (!allValid) {
    console.error('Some proofs are invalid. Aborting.');
    process.exit(1);
  }
  console.log('All proofs verified ✓');

  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
