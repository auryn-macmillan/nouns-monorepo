import { copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Contract as EthersContract } from 'ethers';
import { TASK_COMPILE, TASK_NODE } from 'hardhat/builtin-tasks/task-names';
import { task } from 'hardhat/config';

interface Contract {
  instance: EthersContract;
}

interface DaoV3Contracts {
  [name: string]: Contract;
}

interface InterfoldContracts {
  [name: string]: Contract;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

task(
  'run-local-dao-v3-with-interfold',
  'Start a hardhat node, deploy DAO V3 + Interfold contracts, and execute setup transactions',
).setAction(async (_, { ethers, run }) => {
  await run(TASK_COMPILE);

  await Promise.race([
    run(TASK_NODE, { hostname: '0.0.0.0' }),
    new Promise(resolve => setTimeout(resolve, 2_000)),
  ]);

  await new Promise(resolve => setTimeout(resolve, 2_000));

  const v3Contracts = (await run('deploy-local-dao-v3', {
    votingDelay: 1,
    votingPeriod: 7200,
    proposalUpdatablePeriodInBlocks: 0,
  })) as DaoV3Contracts;

  await run('populate-descriptor', {
    nftDescriptor: v3Contracts.NFTDescriptorV2.instance.address,
    nounsDescriptor: v3Contracts.NounsDescriptorV3.instance.address,
  });

  const votesV5Factory = await ethers.getContractFactory('NounsDAOVotesV5', {
    libraries: {
      NounsDAOVotes: v3Contracts.NounsDAOVotes.instance.address,
    },
  });
  const votesV5Lib = await votesV5Factory.deploy();
  await votesV5Lib.deployed();

  const v5Factory = await ethers.getContractFactory('NounsDAOLogicV5', {
    libraries: {
      NounsDAOVotes: v3Contracts.NounsDAOVotes.instance.address,
      NounsDAOVotesV5: votesV5Lib.address,
      NounsDAOAdmin: v3Contracts.NounsDAOAdmin.instance.address,
      NounsDAOProposals: v3Contracts.NounsDAOProposals.instance.address,
      NounsDAOFork: v3Contracts.NounsDAOFork.instance.address,
      NounsDAODynamicQuorum: v3Contracts.NounsDAODynamicQuorum.instance.address,
    },
  });
  const v5Logic = await v5Factory.deploy();
  await v5Logic.deployed();

  const adminAddress = v3Contracts.NounsDAOExecutorProxy.instance.address;
  await ethers.provider.send('hardhat_impersonateAccount', [adminAddress]);
  await ethers.provider.send('hardhat_setBalance', [adminAddress, '0x1000000000000000000']);

  const adminSigner = await ethers.getSigner(adminAddress);
  const [deployer] = await ethers.getSigners();
  const proxyAddress = v3Contracts.NounsDAOProxyV3.instance.address;
  const proxy = new ethers.Contract(
    proxyAddress,
    ['function _setImplementation(address implementation_)'],
    adminSigner,
  );
  await proxy._setImplementation(v5Logic.address);
  console.log(`Governor upgraded to V5 at ${v5Logic.address}`);

  const interfoldContracts = (await run('deploy-local-interfold', {
    governor: proxyAddress,
    nounsToken: v3Contracts.NounsToken.instance.address,
    weth: v3Contracts.WETH.instance.address,
  })) as InterfoldContracts;

  const v4LogicAddress = interfoldContracts.NounsAuctionHouseV4.instance.address;
  const mockEnclaveAddress = interfoldContracts.MockEnclave.instance.address;
  const mockEnclaveAdapterAddress = interfoldContracts.MockEnclaveAdapter.instance.address;

  const nextNonce = await deployer.getTransactionCount();
  const predictedProxyAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: nextNonce + 2,
  });

  const vickreyProgramFactory = await ethers.getContractFactory('NounsVickreyProgram');
  const vickreyProgram = await vickreyProgramFactory.deploy(predictedProxyAddress, mockEnclaveAddress);
  await vickreyProgram.deployed();

  const proxyAdminFactory = await ethers.getContractFactory('ProxyAdmin');
  const v4ProxyAdmin = await proxyAdminFactory.deploy();
  await v4ProxyAdmin.deployed();

  const v4LogicContract = await ethers.getContractAt('NounsAuctionHouseV4', v4LogicAddress);
  const initData = v4LogicContract.interface.encodeFunctionData('initialize', [
    ethers.utils.parseEther('1'),
    60,
    5,
    ethers.constants.AddressZero,
  ]);
  const proxyFactory = await ethers.getContractFactory('TransparentUpgradeableProxy');
  const v4Proxy = await proxyFactory.deploy(v4LogicAddress, v4ProxyAdmin.address, initData);
  await v4Proxy.deployed();

  if (v4Proxy.address.toLowerCase() !== predictedProxyAddress.toLowerCase()) {
    throw new Error(
      `Proxy address mismatch: predicted ${predictedProxyAddress}, got ${v4Proxy.address}`,
    );
  }

  const v4AuctionHouse = await ethers.getContractAt('NounsAuctionHouseV4', v4Proxy.address);
  await v4AuctionHouse.initializeV4(
    mockEnclaveAdapterAddress,
    vickreyProgram.address,
    ethers.constants.HashZero,
  );

  await v3Contracts.NounsToken.instance.setMinter(v4Proxy.address);
  await v4AuctionHouse.unpause();
  console.log(`V4 auction proxy deployed to ${v4Proxy.address}`);
  console.log(`NounsVickreyProgram deployed to ${vickreyProgram.address}`);

  const governorV5 = new ethers.Contract(
    proxyAddress,
    ['function setCrispVotingSidecar(address sidecar)'],
    adminSigner,
  );
  await governorV5.setCrispVotingSidecar(interfoldContracts.CrispVotingSidecar.instance.address);
  console.log('CrispVotingSidecar registered on governor');

  const governorV5Deployer = new ethers.Contract(
    proxyAddress,
    [
      'function proposeE3(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, bytes32 merkleRoot) returns (uint256)',
    ],
    deployer,
  );

  const proposalId = await governorV5Deployer.callStatic.proposeE3(
    [ethers.constants.AddressZero],
    [0],
    [''],
    ['0x'],
    'Test E3 Proposal',
    ethers.constants.HashZero,
  );
  const proposalTx = await governorV5Deployer.proposeE3(
    [ethers.constants.AddressZero],
    [0],
    [''],
    ['0x'],
    'Test E3 Proposal',
    ethers.constants.HashZero,
  );
  await proposalTx.wait();
  console.log(`Test E3 proposal created with id ${proposalId.toString()}`);

  const mockEnclave = interfoldContracts.MockEnclave.instance;
  await mockEnclave.publishCommitteePublicKey(0, '0x01');
  console.log('Published committee key for auction E3 (e3Id=0)');

  const sidecar = interfoldContracts.CrispVotingSidecar.instance;
  const e3State = await sidecar.e3States(proposalId);
  const votingE3IdUint = ethers.BigNumber.from(e3State[0]);
  await mockEnclave.publishCommitteePublicKey(votingE3IdUint, '0x01');
  console.log(`Published committee key for voting E3 (e3Id=${votingE3IdUint.toString()})`);

  const executorAddress = v3Contracts.NounsDAOExecutorProxy.instance.address;
  await v3Contracts.NounsDescriptorV3.instance.transferOwnership(executorAddress);
  await v3Contracts.NounsToken.instance.transferOwnership(executorAddress);
  await v3Contracts.NounsAuctionHouseProxyAdmin.instance.transferOwnership(executorAddress);
  await v3Contracts.NounsAuctionHouse.instance
    .attach(v3Contracts.NounsAuctionHouseProxy.instance.address)
    .transferOwnership(executorAddress);
  console.log('Transferred ownership to executor.');

  const addresses = {
    nounsGovernor: v3Contracts.NounsDAOProxyV3.instance.address,
    nounsLegacyTreasury: ZERO_ADDRESS,
    nounsTreasury: v3Contracts.NounsDAOExecutorProxy.instance.address,
    nounsData: v3Contracts.NounsDAODataProxy.instance.address,
    nounsToken: v3Contracts.NounsToken.instance.address,
    nounsAuctionHouse: v3Contracts.NounsAuctionHouseProxy.instance.address,
    nounsDescriptor: v3Contracts.NounsDescriptorV3.instance.address,
    nounsStreamFactory: ZERO_ADDRESS,
    nounsPayer: ZERO_ADDRESS,
    nounsTokenBuyer: ZERO_ADDRESS,
    weth: v3Contracts.WETH.instance.address,
    mockEnclave: interfoldContracts.MockEnclave.instance.address,
    mockEnclaveAdapter: interfoldContracts.MockEnclaveAdapter.instance.address,
    mockE3Program: interfoldContracts.MockE3Program.instance.address,
    mockCiphernodeRegistry: interfoldContracts.MockCiphernodeRegistry.instance.address,
    mockDecryptionVerifier: interfoldContracts.MockDecryptionVerifier.instance.address,
    crispVotingSidecar: interfoldContracts.CrispVotingSidecar.instance.address,
    nounsCrispProgram: interfoldContracts.NounsCrispProgram.instance.address,
    nounsAuctionHouseV4: interfoldContracts.NounsAuctionHouseV4.instance.address,
    nounsAuctionHouseV4Proxy: v4Proxy.address,
    nounsVickreyProgram: vickreyProgram.address,
  };

  const contractsAddressesPath = join(__dirname, '../addresses.local.json');
  const webappAddressesPath = join(
    __dirname,
    '../../nouns-webapp/src/contracts/addresses.local.json',
  );

  writeFileSync(contractsAddressesPath, `${JSON.stringify(addresses, null, 2)}\n`);
  copyFileSync(contractsAddressesPath, webappAddressesPath);
  console.log('addresses.local.json written and copied to webapp');

  const { chainId } = await ethers.provider.getNetwork();
  const accounts = {
    'Account #0': {
      Address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      'Private Key': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    },
    'Account #1': {
      Address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
      'Private Key': '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    },
  };

  console.table(accounts);
  console.table(addresses);
  console.log(
    `Noun contracts + Interfold deployed to local node at http://localhost:8545 (Chain ID: ${chainId})`,
  );
  console.log(`Governor proxy address: ${proxyAddress}`);
  console.log(`Governor V5 implementation address: ${v5Logic.address}`);
  console.log(`V3 auction proxy address: ${v3Contracts.NounsAuctionHouseProxy.instance.address}`);
  console.log(`V4 auction proxy address: ${v4Proxy.address}`);
  console.log(`CrispVotingSidecar address: ${interfoldContracts.CrispVotingSidecar.instance.address}`);
  console.log(`MockEnclave address: ${mockEnclaveAddress}`);
  console.log(`NounsVickreyProgram address: ${vickreyProgram.address}`);
  console.log(`Test E3 proposal id: ${proposalId.toString()}`);

  await ethers.provider.send('evm_setIntervalMining', [12_000]);

  await new Promise(() => {
    /* keep node alive until this process is killed */
  });
});
