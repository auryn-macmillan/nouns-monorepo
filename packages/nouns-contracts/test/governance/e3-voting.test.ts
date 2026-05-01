import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import hardhat from 'hardhat';

const { ethers, network } = hardhat;

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';

import {
  NounsDescriptorV3__factory as NounsDescriptorV3Factory,
  NounsToken,
} from '../../typechain';
import {
  advanceBlocks,
  deployNounsToken,
  getSigners,
  populateDescriptorV2,
  setTotalSupply,
  TestSigners,
} from '../utils';

chai.use(solidity);
const { expect } = chai;

const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
  Vetoed: 8,
  ObjectionPeriod: 9,
  Updatable: 10,
} as const;

const ZERO_ADDRESS = ethers.constants.AddressZero;
const TIMELOCK_DELAY = 2 * 24 * 60 * 60;
const VOTING_DELAY = 1;
const VOTING_PERIOD = 7200;
const LAST_MINUTE_WINDOW = 5;
const OBJECTION_PERIOD_DURATION = 4;
const FORK_THRESHOLD_BPS = 4_000;

type Fixture = {
  token: NounsToken;
  governor: Contract;
  governorAdmin: Contract;
  timelock: Contract;
  proxy: Contract;
  forkEscrow: Contract;
  mockEnclave: Contract;
  mockEnclaveAdapter: Contract;
  sidecar: Contract;
  crispProgram: Contract;
  deployer: SignerWithAddress;
  account0: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
};

let snapshotId: string;
let signers: TestSigners;

function computeLeaf(delegate: string, votingPower: bigint): string {
  return ethers.utils.solidityKeccak256(['address', 'uint96'], [delegate, votingPower]);
}

function hashPair(a: string, b: string): string {
  const [left, right] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return ethers.utils.keccak256(ethers.utils.concat([left, right]));
}

function buildMerkleTree(inputs: { delegate: string; votingPower: bigint }[]): {
  root: string;
  proofs: Map<string, string[]>;
} {
  if (inputs.length === 0) {
    return { root: ethers.constants.HashZero, proofs: new Map() };
  }

  const sortedLeaves = inputs
    .map(({ delegate, votingPower }) => computeLeaf(delegate, votingPower))
    .sort((a, b) => (a.toLowerCase() <= b.toLowerCase() ? -1 : 1));

  const layers: string[][] = [sortedLeaves];
  let currentLayer = sortedLeaves;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      nextLayer.push(i + 1 < currentLayer.length ? hashPair(currentLayer[i], currentLayer[i + 1]) : currentLayer[i]);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const proofs = new Map<string, string[]>();
  for (const leaf of sortedLeaves) {
    let index = sortedLeaves.indexOf(leaf);
    const proof: string[] = [];
    for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      if (siblingIndex < layers[layerIndex].length) {
        proof.push(layers[layerIndex][siblingIndex]);
      }
      index = Math.floor(index / 2);
    }
    proofs.set(leaf, proof);
  }

  return { root: currentLayer[0], proofs };
}

async function deployLinkedGovernorV5(deployer: SignerWithAddress): Promise<Contract> {
  const libraryMap: Record<string, string> = {};

  for (const name of ['NounsDAOAdmin', 'NounsDAOProposals', 'NounsDAOFork', 'NounsDAOVotes', 'NounsDAODynamicQuorum']) {
    const factory = await ethers.getContractFactory(name, deployer);
    const contract = await factory.deploy();
    await contract.deployed();
    libraryMap[name] = contract.address;
  }

  const votesV5Factory = await ethers.getContractFactory('NounsDAOVotesV5', {
    signer: deployer,
    libraries: {
      NounsDAOVotes: libraryMap.NounsDAOVotes,
    },
  });
  const votesV5 = await votesV5Factory.deploy();
  await votesV5.deployed();
  libraryMap.NounsDAOVotesV5 = votesV5.address;
  const artifact = await hardhat.artifacts.readArtifact('NounsDAOLogicV5');
  let deployedBytecode = artifact.deployedBytecode;

  for (const [sourceName, sourceLibraries] of Object.entries(artifact.deployedLinkReferences)) {
    for (const [libraryName, references] of Object.entries(sourceLibraries)) {
      const libraryAddress = libraryMap[libraryName];
      if (!libraryAddress) {
        throw new Error(`Missing library for ${sourceName}:${libraryName}`);
      }

      for (const reference of references) {
        const start = 2 + reference.start * 2;
        const length = reference.length * 2;
        deployedBytecode =
          deployedBytecode.slice(0, start) +
          libraryAddress.slice(2) +
          deployedBytecode.slice(start + length);
      }
    }
  }

  const implementationAddress = ethers.Wallet.createRandom().address;
  await network.provider.send('hardhat_setCode', [implementationAddress, deployedBytecode]);

  return new Contract(implementationAddress, artifact.abi, deployer);
}

async function deployFixture(): Promise<Fixture> {
  const { deployer, account0, account1, account2 } = signers;

  const token = await deployNounsToken(deployer);
  await populateDescriptorV2(NounsDescriptorV3Factory.connect(await token.descriptor(), deployer));
  await setTotalSupply(token, 10);

  await token.transferFrom(deployer.address, account0.address, 0);
  await token.transferFrom(deployer.address, account0.address, 1);
  await token.transferFrom(deployer.address, account0.address, 2);
  await token.transferFrom(deployer.address, account0.address, 3);
  await token.transferFrom(deployer.address, account1.address, 4);
  await token.transferFrom(deployer.address, account1.address, 5);
  await token.transferFrom(deployer.address, account1.address, 6);
  await token.transferFrom(deployer.address, account2.address, 7);
  await token.transferFrom(deployer.address, account2.address, 8);

  await token.connect(deployer).delegate(deployer.address);
  await token.connect(account0).delegate(account0.address);
  await token.connect(account1).delegate(account1.address);
  await token.connect(account2).delegate(account2.address);
  await advanceBlocks(2);

  const logic = await deployLinkedGovernorV5(deployer);

  const timelockFactory = await ethers.getContractFactory('NounsDAOExecutorV2', deployer);
  const timelockImplementation = await timelockFactory.deploy();
  await timelockImplementation.deployed();

  const timelockProxyFactory = await ethers.getContractFactory('NounsDAOExecutorProxy', deployer);
  const timelock = await timelockProxyFactory.deploy(
    timelockImplementation.address,
    timelockImplementation.interface.encodeFunctionData('initialize', [deployer.address, TIMELOCK_DELAY]),
  );
  await timelock.deployed();

  const predictedProxyAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: (await deployer.getTransactionCount()) + 1,
  });

  const forkEscrowFactory = await ethers.getContractFactory('NounsDAOForkEscrow', deployer);
  const forkEscrow = await forkEscrowFactory.deploy(predictedProxyAddress, token.address);
  await forkEscrow.deployed();

  const proxyFactory = await ethers.getContractFactory('NounsDAOProxyV3', deployer);
  const proxy = await proxyFactory.deploy(
    timelock.address,
    token.address,
    forkEscrow.address,
    deployer.address,
    deployer.address,
    deployer.address,
    logic.address,
    {
      votingPeriod: VOTING_PERIOD,
      votingDelay: VOTING_DELAY,
      proposalThresholdBPS: 1,
      lastMinuteWindowInBlocks: 0,
      objectionPeriodDurationInBlocks: 0,
      proposalUpdatablePeriodInBlocks: 0,
    },
    {
      minQuorumVotesBPS: 2_000,
      maxQuorumVotesBPS: 2_000,
      quorumCoefficient: 0,
    },
  );
  await proxy.deployed();

  const governor = await ethers.getContractAt('NounsDAOLogicV5', proxy.address, deployer);
  const governorAdmin = new ethers.Contract(
    proxy.address,
    [
      'function _setLastMinuteWindowInBlocks(uint32 newLastMinuteWindowInBlocks)',
      'function _setObjectionPeriodDurationInBlocks(uint32 newObjectionPeriodDurationInBlocks)',
      'function _setForkThresholdBPS(uint256 newForkThresholdBPS)',
    ],
    deployer,
  );

  await governorAdmin._setLastMinuteWindowInBlocks(LAST_MINUTE_WINDOW);
  await governorAdmin._setObjectionPeriodDurationInBlocks(OBJECTION_PERIOD_DURATION);
  await governorAdmin._setForkThresholdBPS(FORK_THRESHOLD_BPS);

  const mockEnclaveFactory = await ethers.getContractFactory('MockEnclave', deployer);
  const mockEnclave = await mockEnclaveFactory.deploy();
  await mockEnclave.deployed();

  const mockEnclaveAdapterFactory = await ethers.getContractFactory('MockEnclaveAdapter', deployer);
  const mockEnclaveAdapter = await mockEnclaveAdapterFactory.deploy(mockEnclave.address);
  await mockEnclaveAdapter.deployed();

  const sidecarFactory = await ethers.getContractFactory('CrispVotingSidecar', deployer);
  const sidecar = await sidecarFactory.deploy(governor.address, mockEnclaveAdapter.address, token.address);
  await sidecar.deployed();

  const crispProgramFactory = await ethers.getContractFactory('NounsCrispProgram', deployer);
  const crispProgram = await crispProgramFactory.deploy(sidecar.address, mockEnclave.address);
  await crispProgram.deployed();

  await governor.setCrispVotingSidecar(sidecar.address);

  return {
    token,
    governor,
    governorAdmin,
    timelock,
    proxy,
    forkEscrow,
    mockEnclave,
    mockEnclaveAdapter,
    sidecar,
    crispProgram,
    deployer,
    account0,
    account1,
    account2,
  };
}

async function reset(): Promise<Fixture> {
  if (snapshotId) {
    await ethers.provider.send('evm_revert', [snapshotId]);
  }

  const fixture = await deployFixture();
  snapshotId = await ethers.provider.send('evm_snapshot', []);
  return fixture;
}

function proposalActions(target: string = ZERO_ADDRESS) {
  return {
    targets: [target],
    values: [0],
    signatures: [''],
    calldatas: ['0x'],
  };
}

async function createRegularProposal(
  governor: Contract,
  proposer: SignerWithAddress,
  description: string,
): Promise<BigNumber> {
  const { targets, values, signatures, calldatas } = proposalActions(proposer.address);
  await governor.connect(proposer)['propose(address[],uint256[],string[],bytes[],string)'](
    targets,
    values,
    signatures,
    calldatas,
    description,
  );
  return governor.latestProposalIds(proposer.address);
}

async function createE3Proposal(
  governor: Contract,
  proposer: SignerWithAddress,
  entries: { delegate: string; votingPower: bigint }[],
  description: string,
): Promise<{ proposalId: BigNumber; root: string; proofs: Map<string, string[]> }> {
  const { targets, values, signatures, calldatas } = proposalActions(proposer.address);
  const { root, proofs } = buildMerkleTree(entries);

  await governor.connect(proposer).proposeE3(targets, values, signatures, calldatas, description, root);

  return {
    proposalId: await governor.latestProposalIds(proposer.address),
    root,
    proofs,
  };
}

async function movePastStart(governor: Contract, proposalId: BigNumber): Promise<void> {
  const proposal = await governor.proposals(proposalId);
  const currentBlock = await ethers.provider.getBlockNumber();
  const blocksToMine = proposal.startBlock.sub(currentBlock).toNumber() + 1;
  if (blocksToMine > 0) {
    await advanceBlocks(blocksToMine);
  }
}

async function movePastEnd(governor: Contract, proposalId: BigNumber): Promise<void> {
  const proposal = await governor.proposals(proposalId);
  const currentBlock = await ethers.provider.getBlockNumber();
  const blocksToMine = proposal.endBlock.sub(currentBlock).toNumber() + 1;
  if (blocksToMine > 0) {
    await advanceBlocks(blocksToMine);
  }
}

async function moveIntoLastMinuteWindow(governor: Contract, proposalId: BigNumber): Promise<void> {
  const proposal = await governor.proposals(proposalId);
  const targetBlock = proposal.endBlock.sub(LAST_MINUTE_WINDOW - 1).toNumber();
  const currentBlock = await ethers.provider.getBlockNumber();
  const blocksToMine = targetBlock - currentBlock;
  if (blocksToMine > 0) {
    await advanceBlocks(blocksToMine);
  }
}

async function getVotingPower(token: NounsToken, voter: string): Promise<bigint> {
  return BigInt((await token.getCurrentVotes(voter)).toString());
}

function proofFor(proofs: Map<string, string[]>, voter: string, votingPower: bigint): string[] {
  return proofs.get(computeLeaf(voter, votingPower)) ?? [];
}

async function markAndSubmitE3Vote(
  governor: Contract,
  sidecar: Contract,
  proposalId: BigNumber,
  voter: SignerWithAddress,
  votingPower: bigint,
  proofs: Map<string, string[]>,
  ciphertext: string,
): Promise<void> {
  await governor.connect(voter).castE3Vote(proposalId);
  await sidecar
    .connect(voter)
    .castE3Vote(proposalId, ciphertext, proofFor(proofs, voter.address, votingPower), votingPower.toString());
}

async function impersonatedSigner(address: string): Promise<SignerWithAddress> {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  await network.provider.send('hardhat_setBalance', [address, '0x1000000000000000000']);
  return ethers.getSigner(address) as Promise<SignerWithAddress>;
}

describe('E3 Voting Full Lifecycle', () => {
  let fixture: Fixture;

  before(async () => {
    signers = await getSigners();
  });

  beforeEach(async () => {
    fixture = await reset();
  });

  it('deploys the full stack, records encrypted votes, decrypts tally, and succeeds when quorum is met', async () => {
    const { token, governor, mockEnclave, mockEnclaveAdapter, sidecar, crispProgram, deployer, account0, account1 } = fixture;

    expect(crispProgram.address).to.properAddress;

    const voter0Power = await getVotingPower(token, account0.address);
    const voter1Power = await getVotingPower(token, account1.address);

    const { proposalId } = await createE3Proposal(
      governor,
      deployer,
      [
        { delegate: account0.address, votingPower: voter0Power },
        { delegate: account1.address, votingPower: voter1Power },
      ],
      'full E3 lifecycle',
    );

    const e3State = await sidecar.e3States(proposalId);
    const e3Id = BigNumber.from(e3State.e3Id);

    await mockEnclave.publishCommitteePublicKey(e3Id, '0x1234');
    await movePastStart(governor, proposalId);

    const { proofs } = buildMerkleTree([
      { delegate: account0.address, votingPower: voter0Power },
      { delegate: account1.address, votingPower: voter1Power },
    ]);

    await markAndSubmitE3Vote(governor, sidecar, proposalId, account0, voter0Power, proofs, '0xaaa1');
    await markAndSubmitE3Vote(governor, sidecar, proposalId, account1, voter1Power, proofs, '0xbbb2');

    const receipt0 = await governor.getReceipt(proposalId, account0.address);
    expect(receipt0.hasVoted).to.equal(true);
    expect(receipt0.isE3Vote).to.equal(true);
    expect(receipt0.votes).to.equal(voter0Power.toString());
    expect(await mockEnclave.getCiphertextCount(e3Id)).to.equal(2);

    await movePastEnd(governor, proposalId);

    await mockEnclave.requestCompute(e3Id);

    const tallyBytes = ethers.utils.defaultAbiCoder.encode(['uint96', 'uint96', 'uint96'], [5, 2, 0]);
    await mockEnclave.publishPlaintextOutput(e3Id, tallyBytes);

    const enclaveSigner = await impersonatedSigner(mockEnclaveAdapter.address);
    await sidecar.connect(enclaveSigner).setE3Tally(proposalId, 5, 2, 0);

    const storedProposal = await governor.proposals(proposalId);
    const storedE3State = await sidecar.e3States(proposalId);

    expect(storedProposal.forVotes).to.equal(5);
    expect(storedProposal.againstVotes).to.equal(2);
    expect(storedProposal.abstainVotes).to.equal(0);
    expect(storedE3State.phase).to.equal(3);
    expect(storedE3State.forVotes).to.equal(5);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Succeeded);
    expect(storedProposal.forVotes.gte(storedProposal.quorumVotes)).to.equal(true);
    expect(await governor.forkThreshold()).to.equal(4);
    expect(storedProposal.againstVotes.lt(await governor.forkThreshold())).to.equal(true);
  });
});

describe('E3 + Non-E3 Coexistence', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await reset();
  });

  it('keeps objection periods for regular proposals while E3 proposals skip them', async () => {
    const { token, governor, mockEnclave, mockEnclaveAdapter, sidecar, deployer, account0, account1 } = fixture;

    const regularProposalId = await createRegularProposal(governor, account0, 'regular proposal');

    const e3VoterPower = await getVotingPower(token, account1.address);
    const { proposalId: e3ProposalId, proofs } = await createE3Proposal(
      governor,
      deployer,
      [{ delegate: account1.address, votingPower: e3VoterPower }],
      'e3 proposal',
    );

    const e3Id = BigNumber.from((await sidecar.e3States(e3ProposalId)).e3Id);
    await mockEnclave.publishCommitteePublicKey(e3Id, '0xabcd');

    await movePastStart(governor, regularProposalId);
    await governor.connect(account1).castVote(regularProposalId, 0);

    await movePastStart(governor, e3ProposalId);
    await markAndSubmitE3Vote(governor, sidecar, e3ProposalId, account1, e3VoterPower, proofs, '0x01');

    await moveIntoLastMinuteWindow(governor, regularProposalId);
    await governor.connect(account0).castVote(regularProposalId, 1);

    const regularProposal = await governor.proposalsV3(regularProposalId);
    expect(regularProposal.objectionPeriodEndBlock.gt(regularProposal.endBlock)).to.equal(true);

    await movePastEnd(governor, regularProposalId);
    expect(await governor.state(regularProposalId)).to.equal(ProposalState.ObjectionPeriod);

    await movePastEnd(governor, e3ProposalId);

    const enclaveSigner = await impersonatedSigner(mockEnclaveAdapter.address);
    await sidecar.connect(enclaveSigner).setE3Tally(e3ProposalId, 3, 0, 0);

    const e3Proposal = await governor.proposalsV3(e3ProposalId);
    expect(e3Proposal.objectionPeriodEndBlock).to.equal(0);
    expect(await governor.state(e3ProposalId)).to.equal(ProposalState.Succeeded);
    expect(await governor.state(e3ProposalId)).to.not.equal(ProposalState.ObjectionPeriod);
  });
});

describe('E3 Voting Edge Cases', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await reset();
  });

  it('marks zero-vote E3 tallies as defeated', async () => {
    const { token, governor, mockEnclave, mockEnclaveAdapter, sidecar, deployer, account0 } = fixture;
    const voterPower = await getVotingPower(token, account0.address);

    const { proposalId } = await createE3Proposal(
      governor,
      deployer,
      [{ delegate: account0.address, votingPower: voterPower }],
      'zero vote tally',
    );

    await movePastEnd(governor, proposalId);

    const enclaveSigner = await impersonatedSigner(mockEnclaveAdapter.address);
    await sidecar.connect(enclaveSigner).setE3Tally(proposalId, 0, 0, 0);

    const proposal = await governor.proposals(proposalId);
    expect(proposal.forVotes).to.equal(0);
    expect(proposal.againstVotes).to.equal(0);
    expect(proposal.abstainVotes).to.equal(0);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Defeated);
  });

  it('forces decay after the E3 timeout and defeats the proposal', async () => {
    const { token, governor, mockEnclaveAdapter, sidecar, deployer, account0 } = fixture;
    const voterPower = await getVotingPower(token, account0.address);

    const { proposalId } = await createE3Proposal(
      governor,
      deployer,
      [{ delegate: account0.address, votingPower: voterPower }],
      'timed out e3',
    );

    const proposal = await governor.proposals(proposalId);
    const blocksToMine = proposal.endBlock.add(await sidecar.e3Timeout()).sub(await ethers.provider.getBlockNumber()).toNumber() + 1;
    await advanceBlocks(blocksToMine);

    await sidecar.forceDecay(proposalId);

    const storedProposal = await governor.proposals(proposalId);
    expect(storedProposal.forVotes).to.equal(0);
    expect(storedProposal.againstVotes).to.equal(0);
    expect(storedProposal.abstainVotes).to.equal(0);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Defeated);
  });

  it('reverts when a voter tries to use regular castVote on an E3 proposal', async () => {
    const { token, governor, deployer, account0 } = fixture;
    const voterPower = await getVotingPower(token, account0.address);

    const { proposalId } = await createE3Proposal(
      governor,
      deployer,
      [{ delegate: account0.address, votingPower: voterPower }],
      'reject regular voting path',
    );

    await movePastStart(governor, proposalId);

    await expect(governor.connect(account0).castVote(proposalId, 1)).to.be.reverted;
  });
});
