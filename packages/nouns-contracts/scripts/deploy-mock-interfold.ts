import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (network.chainId !== 31337 && network.chainId !== 1337) {
    throw new Error(`Refusing to deploy local-only mocks to chain ${network.chainId}`);
  }

  const enclaveFactory = await ethers.getContractFactory('MockEnclave');
  const programFactory = await ethers.getContractFactory('MockE3Program');
  const registryFactory = await ethers.getContractFactory('MockCiphernodeRegistry');
  const verifierFactory = await ethers.getContractFactory('MockDecryptionVerifier');

  const enclave = await enclaveFactory.deploy();
  const program = await programFactory.deploy();
  const registry = await registryFactory.deploy();
  const verifier = await verifierFactory.deploy();

  await Promise.all([enclave.deployed(), program.deployed(), registry.deployed(), verifier.deployed()]);

  console.log('Mock Interfold deployed');
  console.log('deployer:', deployer.address);
  console.log('MockEnclave:', enclave.address);
  console.log('MockE3Program:', program.address);
  console.log('MockCiphernodeRegistry:', registry.address);
  console.log('MockDecryptionVerifier:', verifier.address);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
