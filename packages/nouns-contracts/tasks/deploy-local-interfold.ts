import { copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { Contract as EthersContract } from 'ethers';
import { task, types } from 'hardhat/config';

type LocalInterfoldContractName =
  | 'MockEnclave'
  | 'MockEnclaveAdapter'
  | 'MockE3Program'
  | 'MockCiphernodeRegistry'
  | 'MockDecryptionVerifier'
  | 'CrispVotingSidecar'
  | 'NounsCrispProgram'
  | 'NounsAuctionHouseV4';

interface Contract {
  args?: (string | number | (() => string | undefined))[];
  instance?: EthersContract;
  waitForConfirmation?: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

task('deploy-local-interfold', 'Deploy Interfold contracts to a local hardhat node')
  .addOptionalParam('governor', 'The Nouns Governor address', undefined, types.string)
  .addOptionalParam('nounsToken', 'The Nouns token address', undefined, types.string)
  .addOptionalParam('weth', 'The WETH contract address', undefined, types.string)
  .addOptionalParam('auctionDuration', 'The auction duration (seconds)', 120, types.int)
  .addOptionalParam('minPrice', 'The minimum sealed bid price (wei)', '1000000000000000000', types.string)
  .addOptionalParam(
    'maxPrice',
    'The maximum sealed bid price (wei)',
    '100000000000000000000',
    types.string,
  )
  .setAction(async (args, { ethers }) => {
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 31337 && network.chainId !== 1337) {
      throw new Error(`Invalid chain id. Expected 31337 or 1337. Got: ${network.chainId}.`);
    }

    if (!args.governor) {
      throw new Error('Missing required --governor address.');
    }

    if (!args.nounsToken) {
      throw new Error('Missing required --nouns-token address.');
    }

    if (!args.weth) {
      throw new Error('Missing required --weth address.');
    }

    const contracts: Record<LocalInterfoldContractName, Contract> = {
      MockEnclave: {},
      MockEnclaveAdapter: {
        args: [() => contracts.MockEnclave.instance?.address],
      },
      MockE3Program: {},
      MockCiphernodeRegistry: {},
      MockDecryptionVerifier: {},
      CrispVotingSidecar: {
        args: [args.governor, () => contracts.MockEnclaveAdapter.instance?.address, args.nounsToken],
        waitForConfirmation: true,
      },
      NounsCrispProgram: {
        args: [() => contracts.CrispVotingSidecar.instance?.address, () => contracts.MockEnclave.instance?.address],
        waitForConfirmation: true,
      },
      NounsAuctionHouseV4: {
        args: [args.nounsToken, args.weth, args.auctionDuration, args.minPrice, args.maxPrice],
        waitForConfirmation: true,
      },
    };

    for (const [name, contract] of Object.entries(contracts)) {
      const factory = await ethers.getContractFactory(name);

      const deployedContract = await factory.deploy(
        ...(contract.args?.map(a => (typeof a === 'function' ? a() : a)) ?? []),
      );

      if (contract.waitForConfirmation) {
        await deployedContract.deployed();
      }

      contracts[name as LocalInterfoldContractName].instance = deployedContract;

      console.log(`${name} contract deployed to ${deployedContract.address}`);
    }

    const addresses = {
      nounsGovernor: ZERO_ADDRESS,
      nounsLegacyTreasury: ZERO_ADDRESS,
      nounsTreasury: ZERO_ADDRESS,
      nounsData: ZERO_ADDRESS,
      nounsToken: ZERO_ADDRESS,
      nounsAuctionHouse: ZERO_ADDRESS,
      nounsDescriptor: ZERO_ADDRESS,
      nounsStreamFactory: ZERO_ADDRESS,
      nounsPayer: ZERO_ADDRESS,
      nounsTokenBuyer: ZERO_ADDRESS,
      weth: ZERO_ADDRESS,
      mockEnclave: contracts.MockEnclave.instance?.address ?? ZERO_ADDRESS,
      mockEnclaveAdapter: contracts.MockEnclaveAdapter.instance?.address ?? ZERO_ADDRESS,
      mockE3Program: contracts.MockE3Program.instance?.address ?? ZERO_ADDRESS,
      mockCiphernodeRegistry: contracts.MockCiphernodeRegistry.instance?.address ?? ZERO_ADDRESS,
      mockDecryptionVerifier: contracts.MockDecryptionVerifier.instance?.address ?? ZERO_ADDRESS,
      crispVotingSidecar: contracts.CrispVotingSidecar.instance?.address ?? ZERO_ADDRESS,
      nounsCrispProgram: contracts.NounsCrispProgram.instance?.address ?? ZERO_ADDRESS,
      nounsAuctionHouseV4: contracts.NounsAuctionHouseV4.instance?.address ?? ZERO_ADDRESS,
      nounsAuctionHouseV4Proxy: ZERO_ADDRESS,
      nounsVickreyProgram: ZERO_ADDRESS,
    };

    const contractsAddressesPath = join(__dirname, '../addresses.local.json');
    const webappAddressesPath = join(__dirname, '../../nouns-webapp/src/contracts/addresses.local.json');

    writeFileSync(contractsAddressesPath, `${JSON.stringify(addresses, null, 2)}\n`);
    copyFileSync(contractsAddressesPath, webappAddressesPath);

    return contracts;
  });
