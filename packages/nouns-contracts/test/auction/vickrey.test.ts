import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import hardhat from 'hardhat';

const { ethers } = hardhat;

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';

import {
  MockEnclave,
  MockEnclave__factory,
  NounsAuctionHouseV4,
  NounsAuctionHouseV4__factory,
  NounsDescriptorV3__factory as NounsDescriptorV3Factory,
  NounsToken,
  NounsVickreyProgram,
  NounsVickreyProgram__factory,
  TransparentUpgradeableProxy__factory,
  WETH,
  WETH__factory,
} from '../../typechain';
import { deployNounsToken, populateDescriptorV2, setNextBlockTimestamp } from '../utils';

chai.use(solidity);
const { expect } = chai;

const ZERO_ADDRESS = ethers.constants.AddressZero;
const HASH_ZERO = ethers.constants.HashZero;
const DURATION = 60 * 60;
const TIME_BUFFER = 15 * 60;
const MIN_BID_INCREMENT_PERCENTAGE = 5;
const MIN_PRICE = ethers.utils.parseEther('1');
const MAX_PRICE = ethers.utils.parseEther('4');

type Fixture = {
  token: NounsToken;
  weth: WETH;
  mockEnclave: MockEnclave;
  enclaveAdapter: Contract;
  program: NounsVickreyProgram;
  auctionHouse: NounsAuctionHouseV4;
  deployer: SignerWithAddress;
  bidderA: SignerWithAddress;
  bidderB: SignerWithAddress;
  bidderC: SignerWithAddress;
  proxyAdmin: SignerWithAddress;
};

let snapshotId: string;
let deployer: SignerWithAddress;
let bidderA: SignerWithAddress;
let bidderB: SignerWithAddress;
let bidderC: SignerWithAddress;
let proxyAdmin: SignerWithAddress;

function secondPriceForBucket(bucket: number): BigNumber {
  return MIN_PRICE.add(MAX_PRICE.sub(MIN_PRICE).mul(bucket).div(256));
}

function nestedErrorData(error: any): string | undefined {
  return error?.data ?? error?.error?.data ?? error?.error?.error?.data;
}

async function expectCustomErrorRevert(
  promise: Promise<unknown>,
  contract: Contract,
  signature: string,
): Promise<void> {
  try {
    await promise;
    expect.fail(`Expected revert with ${signature}`);
  } catch (error: any) {
    const data = nestedErrorData(error);
    expect(data, error?.message ?? 'missing revert data').to.be.a('string');
    expect((data as string).slice(0, 10)).to.equal(contract.interface.getSighash(signature));
  }
}

async function deployFixture(): Promise<Fixture> {
  const token = await deployNounsToken(deployer, deployer.address, deployer.address);
  await populateDescriptorV2(NounsDescriptorV3Factory.connect(await token.descriptor(), deployer));

  const weth = await new WETH__factory(deployer).deploy();
  await weth.deployed();

  const mockEnclave = await new MockEnclave__factory(deployer).deploy();
  await mockEnclave.deployed();

  const enclaveAdapterFactory = await ethers.getContractFactory('MockEnclaveAdapter', deployer);
  const enclaveAdapter = await enclaveAdapterFactory.deploy(mockEnclave.address);
  await enclaveAdapter.deployed();

  const logic = await new NounsAuctionHouseV4__factory(deployer).deploy(
    token.address,
    weth.address,
    DURATION,
    MIN_PRICE,
    MAX_PRICE,
  );
  await logic.deployed();

  const nextNonce = await deployer.getTransactionCount();
  const predictedProxyAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: nextNonce + 1,
  });

  const program = await new NounsVickreyProgram__factory(deployer).deploy(
    predictedProxyAddress,
    mockEnclave.address,
  );
  await program.deployed();

  const proxy = await new TransparentUpgradeableProxy__factory(deployer).deploy(
    logic.address,
    proxyAdmin.address,
    logic.interface.encodeFunctionData('initialize', [
      MIN_PRICE,
      TIME_BUFFER,
      MIN_BID_INCREMENT_PERCENTAGE,
      ZERO_ADDRESS,
    ]),
  );
  await proxy.deployed();

  const auctionHouse = NounsAuctionHouseV4__factory.connect(proxy.address, deployer);
  await auctionHouse.initializeV4(enclaveAdapter.address, program.address, HASH_ZERO);
  await token.setMinter(auctionHouse.address);
  await auctionHouse.unpause();

  return {
    token,
    weth,
    mockEnclave,
    enclaveAdapter,
    program,
    auctionHouse,
    deployer,
    bidderA,
    bidderB,
    bidderC,
    proxyAdmin,
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

async function getAuctionIds(auctionHouse: NounsAuctionHouseV4): Promise<{
  nounId: BigNumber;
  e3Id: BigNumber;
}> {
  const liveAuction = await auctionHouse.auction();
  const vickreyAuction = await auctionHouse.getVickreyAuction(liveAuction.nounId);

  return {
    nounId: liveAuction.nounId,
    e3Id: BigNumber.from(vickreyAuction.e3Id),
  };
}

async function publishCommitteeKey(fixture: Fixture, e3Id: BigNumber): Promise<void> {
  await fixture.mockEnclave.publishCommitteePublicKey(e3Id, '0x1234');
}

async function endCurrentAuction(auctionHouse: NounsAuctionHouseV4): Promise<void> {
  const liveAuction = await auctionHouse.auction();
  await setNextBlockTimestamp(BigNumber.from(liveAuction.endTime).toNumber() + 1);
}

async function submitBid(
  auctionHouse: NounsAuctionHouseV4,
  bidder: SignerWithAddress,
  nounId: BigNumber,
  ciphertext: string,
  value: BigNumber = MAX_PRICE,
): Promise<void> {
  await auctionHouse.connect(bidder).submitSealedBid(nounId, ciphertext, [], { value });
}

async function decodeViaEnclave(
  fixture: Fixture,
  e3Id: BigNumber,
  secondPriceBucket: number,
  winner: string,
  zeroBids: boolean,
): Promise<void> {
  await fixture.mockEnclave.requestCompute(e3Id);
  await fixture.mockEnclave.submitDecryption(
    e3Id,
    ethers.utils.defaultAbiCoder.encode(['uint256', 'address', 'bool'], [secondPriceBucket, winner, zeroBids]),
  );
}

async function decodeAsEnclaveSigner(
  fixture: Fixture,
  e3Id: BigNumber,
  secondPriceBucket: number,
  winner: string,
  zeroBids: boolean,
): Promise<void> {
  await ethers.provider.send('hardhat_impersonateAccount', [fixture.mockEnclave.address]);
  await ethers.provider.send('hardhat_setBalance', [fixture.mockEnclave.address, '0x1000000000000000000']);

  const enclaveSigner = (await ethers.getSigner(fixture.mockEnclave.address)) as SignerWithAddress;

  await fixture.program.connect(enclaveSigner).verify(
    ethers.utils.hexZeroPad(e3Id.toHexString(), 32),
    ethers.utils.defaultAbiCoder.encode(['uint256', 'address', 'bool'], [secondPriceBucket, winner, zeroBids]),
  );
}

describe('Vickrey Auction Full Lifecycle', () => {
  let fixture: Fixture;

  before(async () => {
    [deployer, bidderA, bidderB, bidderC, proxyAdmin] = await ethers.getSigners();
  });

  beforeEach(async () => {
    fixture = await reset();
  });

  it('creates an E3 request, settles at second price, transfers the noun, and refunds collateral', async () => {
    const { auctionHouse, mockEnclave, token } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);
    const secondPrice = secondPriceForBucket(64);

    expect(await mockEnclave.nextE3Id()).to.equal(1);
    expect((await mockEnclave.e3States(e3Id)).program).to.equal(fixture.program.address);
    expect(await auctionHouse.e3ToAuction(ethers.utils.hexZeroPad(e3Id.toHexString(), 32))).to.equal(nounId);
    expect(await auctionHouse.currentPhase()).to.equal(0);

    await publishCommitteeKey(fixture, e3Id);

    await submitBid(auctionHouse, bidderA, nounId, '0xaa');
    await submitBid(auctionHouse, bidderB, nounId, '0xbb');

    expect(await auctionHouse.hasSubmittedSealedBid(nounId, bidderA.address)).to.equal(true);
    expect(await auctionHouse.hasSubmittedSealedBid(nounId, bidderB.address)).to.equal(true);
    expect((await auctionHouse.getVickreyAuction(nounId)).bidCount).to.equal(2);
    expect(await mockEnclave.getCiphertextCount(e3Id)).to.equal(2);

    const winnerBalanceBeforeSettle = await bidderA.getBalance();
    const loserBalanceBeforeSettle = await bidderB.getBalance();

    await endCurrentAuction(auctionHouse);
    expect(await auctionHouse.currentPhase()).to.equal(1);

    await decodeViaEnclave(fixture, e3Id, 64, bidderA.address, false);

    const ownerBalanceBeforeSettle = await deployer.getBalance();

    const revealedAuction = await auctionHouse.getVickreyAuction(nounId);
    expect(revealedAuction.phase).to.equal(2);
    expect(revealedAuction.winner).to.equal(bidderA.address);
    expect(revealedAuction.secondPrice).to.equal(secondPrice);
    expect(await auctionHouse.currentPhase()).to.equal(2);

    await auctionHouse.connect(bidderC).settleCurrentAndCreateNewAuction();

    expect(await token.ownerOf(nounId)).to.equal(bidderA.address);
    expect((await bidderA.getBalance()).sub(winnerBalanceBeforeSettle)).to.equal(MAX_PRICE.sub(secondPrice));
    expect((await bidderB.getBalance()).sub(loserBalanceBeforeSettle)).to.equal(MAX_PRICE);
    expect((await deployer.getBalance()).sub(ownerBalanceBeforeSettle)).to.equal(secondPrice);
  });
});

describe('Vickrey Auction Edge Cases', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await reset();
  });

  it('settles a single bidder auction at MIN_PRICE', async () => {
    const { auctionHouse, token } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await publishCommitteeKey(fixture, e3Id);
    await submitBid(auctionHouse, bidderA, nounId, '0x01');

    const winnerBalanceBeforeSettle = await bidderA.getBalance();

    await endCurrentAuction(auctionHouse);
    await decodeViaEnclave(fixture, e3Id, 255, bidderA.address, false);

    const ownerBalanceBeforeSettle = await deployer.getBalance();

    await auctionHouse.connect(bidderC).settleCurrentAndCreateNewAuction();

    expect(await token.ownerOf(nounId)).to.equal(bidderA.address);
    expect((await bidderA.getBalance()).sub(winnerBalanceBeforeSettle)).to.equal(MAX_PRICE.sub(MIN_PRICE));
    expect((await deployer.getBalance()).sub(ownerBalanceBeforeSettle)).to.equal(MIN_PRICE);
    expect((await auctionHouse.getVickreyAuction(nounId)).secondPrice).to.equal(MIN_PRICE);
  });

  it('burns the noun when zero bids are decoded', async () => {
    const { auctionHouse, token } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await endCurrentAuction(auctionHouse);
    await decodeAsEnclaveSigner(fixture, e3Id, 0, ZERO_ADDRESS, true);
    await auctionHouse.connect(bidderC).settleCurrentAndCreateNewAuction();

    await expect(token.ownerOf(nounId)).to.be.revertedWith('ERC721: owner query for nonexistent token');
    expect((await auctionHouse.getVickreyAuction(nounId)).zeroBids).to.equal(true);
  });

  it('honors the decoded first bidder winner for a same-bucket tie', async () => {
    const { auctionHouse, token } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);
    const secondPrice = secondPriceForBucket(32);

    await publishCommitteeKey(fixture, e3Id);
    await submitBid(auctionHouse, bidderA, nounId, '0x11');
    await submitBid(auctionHouse, bidderB, nounId, '0x22');

    await endCurrentAuction(auctionHouse);
    await decodeViaEnclave(fixture, e3Id, 32, bidderA.address, false);
    await auctionHouse.connect(bidderC).settleCurrentAndCreateNewAuction();

    expect(await token.ownerOf(nounId)).to.equal(bidderA.address);
    expect((await auctionHouse.getVickreyAuction(nounId)).winner).to.equal(bidderA.address);
    expect((await auctionHouse.getVickreyAuction(nounId)).secondPrice).to.equal(secondPrice);
  });

  it('prevents the same bidder from submitting twice', async () => {
    const { auctionHouse } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await publishCommitteeKey(fixture, e3Id);
    await submitBid(auctionHouse, bidderA, nounId, '0x33');

    await expectCustomErrorRevert(
      auctionHouse.connect(bidderA).submitSealedBid(nounId, '0x44', [], { value: MAX_PRICE }),
      auctionHouse,
      'AlreadySubmitted(address,uint256)',
    );
  });
});

describe('Collateral Management', () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await reset();
  });

  it('escrows MAX_PRICE collateral for each sealed bid', async () => {
    const { auctionHouse } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await publishCommitteeKey(fixture, e3Id);
    await submitBid(auctionHouse, bidderA, nounId, '0x55');
    await submitBid(auctionHouse, bidderB, nounId, '0x66');

    expect(await ethers.provider.getBalance(auctionHouse.address)).to.equal(MAX_PRICE.mul(2));
  });

  it('refunds losers fully and the winner by MAX_PRICE minus secondPrice after settlement', async () => {
    const { auctionHouse } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);
    const secondPrice = secondPriceForBucket(96);

    await publishCommitteeKey(fixture, e3Id);
    await submitBid(auctionHouse, bidderA, nounId, '0x77');
    await submitBid(auctionHouse, bidderB, nounId, '0x88');

    const winnerBalanceBeforeSettle = await bidderB.getBalance();
    const loserBalanceBeforeSettle = await bidderA.getBalance();

    await endCurrentAuction(auctionHouse);
    await decodeViaEnclave(fixture, e3Id, 96, bidderB.address, false);
    await auctionHouse.connect(bidderC).settleCurrentAndCreateNewAuction();

    expect((await bidderA.getBalance()).sub(loserBalanceBeforeSettle)).to.equal(MAX_PRICE);
    expect((await bidderB.getBalance()).sub(winnerBalanceBeforeSettle)).to.equal(MAX_PRICE.sub(secondPrice));
  });

  it('reverts when the collateral is not exactly MAX_PRICE', async () => {
    const { auctionHouse } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await publishCommitteeKey(fixture, e3Id);

    await expectCustomErrorRevert(
      auctionHouse.connect(bidderA).submitSealedBid(nounId, '0x99', [], { value: MIN_PRICE }),
      auctionHouse,
      'InvalidCollateral()',
    );
  });

  it('reverts when bidding after the auction has expired', async () => {
    const { auctionHouse } = fixture;
    const { nounId, e3Id } = await getAuctionIds(auctionHouse);

    await publishCommitteeKey(fixture, e3Id);
    await endCurrentAuction(auctionHouse);

    await expectCustomErrorRevert(
      auctionHouse.connect(bidderA).submitSealedBid(nounId, '0xaa', [], { value: MAX_PRICE }),
      auctionHouse,
      'AuctionExpired()',
    );
  });
});
