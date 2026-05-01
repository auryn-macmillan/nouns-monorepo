import { BigNumber, Contract } from 'ethers';
import { task, types } from 'hardhat/config';

const mockEnclaveAbi = [
  'function getE3State(uint256 e3Id) view returns (address, uint8, uint256, bytes)',
  'function publishCommitteePublicKey(uint256 e3Id, bytes calldata publicKey)',
  'function publishInput(uint256 e3Id, bytes calldata ciphertext)',
  'function requestCompute(uint256 e3Id)',
  'function publishPlaintextOutput(uint256 e3Id, bytes calldata output)',
  'function submitDecryption(uint256 e3Id, bytes calldata data)',
  'function getCiphertext(uint256 e3Id, uint256 index) view returns (bytes memory)',
  'function getCiphertextCount(uint256 e3Id) view returns (uint256)',
];

const auctionHouseAbi = [
  'function auction() view returns (uint256 nounId, uint256 amount, uint256 startTime, uint256 endTime, address bidder, bool settled)',
  'function getVickreyAuction(uint256 nounId) view returns (uint256 nounIdOut, bytes32 e3Id, bytes32 merkleRoot, uint8 phase, uint256 bidCount, uint256 secondPriceBucket, uint256 secondPrice, address winner, bool zeroBids)',
  'function hasSubmittedSealedBid(uint256 nounId, address bidder) view returns (bool)',
];

const sidecarAbi = [
  'function e3States(uint256 proposalId) view returns (bytes32 e3Id, bytes32 merkleRoot, uint8 phase, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes)',
  'function e3ToProposal(bytes32 e3Id) view returns (uint256)',
  'function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes)',
];

const governorAbi = [
  'function proposals(uint256 proposalId) view returns (uint256 id, address proposer, uint256 proposalThreshold, uint256 quorumVotes, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool vetoed, bool executed, uint256 totalSupply, uint256 creationBlock)',
];

async function readInputs(mockEnclave: Contract, e3Id: BigNumber): Promise<string[]> {
  const ciphertextCount = await mockEnclave.getCiphertextCount(e3Id);
  const inputs: string[] = [];

  for (let index = 0; index < ciphertextCount.toNumber(); index++) {
    inputs.push(await mockEnclave.getCiphertext(e3Id, index));
  }

  return inputs;
}

async function settleAuction(
  ethers: typeof import('hardhat')['ethers'],
  deployer: Awaited<ReturnType<typeof ethers.getSigners>>[number],
  mockEnclave: Contract,
  e3Id: BigNumber,
  inputs: string[],
  auctionV4Address: string,
) {
  const auctionHouse = new ethers.Contract(auctionV4Address, auctionHouseAbi, deployer);
  const liveAuction = await auctionHouse.auction();
  const auctionState = await auctionHouse.getVickreyAuction(liveAuction.nounId);

  if (!BigNumber.from(auctionState.e3Id).eq(e3Id)) {
    throw new Error(
      `Auction E3 mismatch. Current auction nounId=${liveAuction.nounId.toString()} has e3Id=${BigNumber.from(
        auctionState.e3Id,
      ).toString()}, expected ${e3Id.toString()}.`,
    );
  }

  const endTime = liveAuction.endTime.toNumber();
  const block = await ethers.provider.getBlock('latest');
  if (block.timestamp <= endTime) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [endTime + 1]);
    await ethers.provider.send('evm_mine', []);
    console.log(`Time warped past auction endTime (${endTime})`);
  }

  const bids: number[] = [];
  for (const ciphertext of inputs) {
    try {
      const [priceBucket] = ethers.utils.defaultAbiCoder.decode(['uint256'], ciphertext);
      bids.push(priceBucket.toNumber());
    } catch {
      // Skip malformed ciphertexts.
    }
  }

  const sorted = [...bids].sort((a, b) => b - a);
  const winnerBucket = sorted[0] ?? 0;
  const secondPriceBucket = sorted[1] ?? winnerBucket;
  const zeroBids = bids.length === 0 || bids.every(bid => bid === 0);

  let winner = ethers.constants.AddressZero;
  if (!zeroBids) {
    const candidateWinner = liveAuction.bidder;
    if (
      candidateWinner !== ethers.constants.AddressZero &&
      (await auctionHouse.hasSubmittedSealedBid(liveAuction.nounId, candidateWinner))
    ) {
      winner = candidateWinner;
    } else {
      console.log(
        'Current auction bidder is not a valid sealed-bid participant; using zero address winner and treating as zero-bid result.',
      );
    }
  }

  const effectiveZeroBids = zeroBids || winner === ethers.constants.AddressZero;

  console.log(`Bids: ${bids.length > 0 ? bids.join(', ') : '(none)'}`);
  console.log(`Winner bucket: ${winnerBucket}, Second price bucket: ${secondPriceBucket}`);

  const resultBytes = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'address', 'bool'],
    [secondPriceBucket, effectiveZeroBids ? ethers.constants.AddressZero : winner, effectiveZeroBids],
  );

  await mockEnclave.submitDecryption(e3Id, resultBytes);
  console.log('submitDecryption called (settlement callback triggered)');

  await mockEnclave.publishPlaintextOutput(e3Id, resultBytes);
  console.log('E3 phase advanced to: Complete');
  console.log(
    `Winner: ${effectiveZeroBids ? ethers.constants.AddressZero : winner}, Second price bucket: ${secondPriceBucket}`,
  );
}

async function settleVoting(
  ethers: typeof import('hardhat')['ethers'],
  deployer: Awaited<ReturnType<typeof ethers.getSigners>>[number],
  mockEnclave: Contract,
  e3Id: BigNumber,
  inputs: string[],
  sidecarAddress: string,
  enclaveAdapterAddress?: string,
  governorAddress?: string,
) {
  let forVotes = BigNumber.from(0);
  let againstVotes = BigNumber.from(0);
  let abstainVotes = BigNumber.from(0);

  for (const ciphertext of inputs) {
    try {
      const [support, votingPower] = ethers.utils.defaultAbiCoder.decode(['uint8', 'uint256'], ciphertext);
      const supportValue = Number(support);

      if (supportValue === 0) {
        abstainVotes = abstainVotes.add(votingPower);
      } else if (supportValue === 1) {
        forVotes = forVotes.add(votingPower);
      } else if (supportValue === 2) {
        againstVotes = againstVotes.add(votingPower);
      }
    } catch {
      // Skip malformed ciphertexts.
    }
  }

  console.log(`Tally: forVotes=${forVotes}, againstVotes=${againstVotes}, abstainVotes=${abstainVotes}`);

  const tallyBytes = ethers.utils.defaultAbiCoder.encode(
    ['uint96', 'uint96', 'uint96'],
    [forVotes, againstVotes, abstainVotes],
  );
  await mockEnclave.publishPlaintextOutput(e3Id, tallyBytes);
  console.log('E3 phase advanced to: Complete');

  if (!enclaveAdapterAddress) {
    console.log('No --enclave-adapter provided, skipping setE3Tally()');
    return;
  }

  const sidecar = new ethers.Contract(sidecarAddress, sidecarAbi, deployer);
  const e3IdBytes32 = ethers.utils.hexZeroPad(e3Id.toHexString(), 32);

  let proposalId: BigNumber | null = null;
  try {
    const directProposalId = await sidecar.e3ToProposal(e3IdBytes32);
    if (!BigNumber.from(directProposalId).isZero()) {
      proposalId = BigNumber.from(directProposalId);
    }
  } catch {
    // Fallback to bounded scan below.
  }

  if (proposalId === null) {
    for (let pid = 1; pid <= 10; pid++) {
      try {
        const state = await sidecar.e3States(pid);
        if (BigNumber.from(state.e3Id).eq(e3Id)) {
          proposalId = BigNumber.from(pid);
          break;
        }
      } catch {
        break;
      }
    }
  }

  if (proposalId === null) {
    console.log(`Could not find proposalId for e3Id ${e3Id.toString()}, skipping setE3Tally()`);
    return;
  }

  console.log(`Found proposalId ${proposalId.toString()} for e3Id ${e3Id.toString()}`);

  if (governorAddress) {
    const governor = new ethers.Contract(governorAddress, governorAbi, deployer);
    const proposal = await governor.proposals(proposalId);
    const endBlock = proposal.endBlock.toNumber();
    const currentBlock = await ethers.provider.getBlockNumber();

    if (currentBlock <= endBlock) {
      const blocksToMine = endBlock - currentBlock + 1;
      console.log(`Mining ${blocksToMine} blocks to pass proposal endBlock ${endBlock}...`);
      for (let index = 0; index < blocksToMine; index++) {
        await ethers.provider.send('evm_mine', []);
      }
    }
  }

  await ethers.provider.send('hardhat_impersonateAccount', [enclaveAdapterAddress]);
  await ethers.provider.send('hardhat_setBalance', [enclaveAdapterAddress, '0x1000000000000000000']);
  const enclaveSigner = await ethers.getSigner(enclaveAdapterAddress);
  const sidecarAsEnclave = sidecar.connect(enclaveSigner);

  try {
    await sidecarAsEnclave.setE3Tally(proposalId, forVotes, againstVotes, abstainVotes);
    console.log(
      `setE3Tally called for proposalId ${proposalId.toString()}: forVotes=${forVotes}, againstVotes=${againstVotes}, abstainVotes=${abstainVotes}`,
    );
  } finally {
    await ethers.provider.send('hardhat_stopImpersonatingAccount', [enclaveAdapterAddress]);
  }
}

task('simulate-e3-lifecycle', 'Advance an E3 through its phases and trigger on-chain settlement')
  .addParam('e3Id', 'The E3 ID to advance (uint256)', undefined, types.string)
  .addParam('enclave', 'MockEnclave address (raw, NOT adapter)', undefined, types.string)
  .addOptionalParam(
    'enclaveAdapter',
    'MockEnclaveAdapter address (for setE3Tally impersonation)',
    undefined,
    types.string,
  )
  .addOptionalParam('sidecar', 'CrispVotingSidecar address (for voting settlement)', undefined, types.string)
  .addOptionalParam('auctionV4', 'NounsAuctionHouseV4 proxy address (for auction settlement)', undefined, types.string)
  .addOptionalParam('governor', 'NounsDAOProxyV3 address (for reading proposal state)', undefined, types.string)
  .setAction(async (args, { ethers }) => {
    const [deployer] = await ethers.getSigners();
    const mockEnclave = new ethers.Contract(args.enclave, mockEnclaveAbi, deployer);

    const e3Id = BigNumber.from(args.e3Id);
    const stateResult = await mockEnclave.getE3State(e3Id);
    let phase = Number(stateResult[1]);

    console.log(`Current E3 phase: ${phase}`);

    if (phase === 5) {
      console.log('E3 computation already complete');
      return;
    }

    if (phase === 1) {
      await mockEnclave.publishCommitteePublicKey(e3Id, '0x01');
      console.log('E3 phase advanced to: KeyPublished');
      phase = 2;
    }

    if (phase === 2) {
      const dummyCiphertext = ethers.utils.defaultAbiCoder.encode(['uint256'], [0]);
      await mockEnclave.publishInput(e3Id, dummyCiphertext);
      console.log('E3 phase advanced to: InputsReady (dummy input published)');
      phase = 3;
    }

    if (phase === 3) {
      await mockEnclave.requestCompute(e3Id);
      console.log('E3 phase advanced to: Computing');
      phase = 4;
    }

    if (phase === 4) {
      const inputs = await readInputs(mockEnclave, e3Id);

      if (args.auctionV4) {
        await settleAuction(ethers, deployer, mockEnclave, e3Id, inputs, args.auctionV4);
      } else if (args.sidecar) {
        await settleVoting(
          ethers,
          deployer,
          mockEnclave,
          e3Id,
          inputs,
          args.sidecar,
          args.enclaveAdapter,
          args.governor,
        );
      } else {
        await mockEnclave.publishPlaintextOutput(e3Id, '0x');
        console.log('E3 phase advanced to: Complete (no settlement)');
      }
    }
  });
