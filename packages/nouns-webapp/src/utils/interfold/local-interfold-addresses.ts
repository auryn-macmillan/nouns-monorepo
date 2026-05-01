import addresses from '../../contracts/addresses.local.json';

export interface LocalInterfoldAddresses {
  mockEnclave: `0x${string}`;
  mockEnclaveAdapter: `0x${string}`;
  mockE3Program: `0x${string}`;
  mockCiphernodeRegistry: `0x${string}`;
  mockDecryptionVerifier: `0x${string}`;
  crispVotingSidecar: `0x${string}`;
  nounsCrispProgram: `0x${string}`;
  nounsAuctionHouseV4: `0x${string}`;
  nounsAuctionHouseV4Proxy: `0x${string}`;
  nounsVickreyProgram: `0x${string}`;
}

const LOCAL_INTERFOLD_CHAIN_ID = 31337;

const LOCAL_INTERFOLD_ADDRESSES: LocalInterfoldAddresses = {
  mockEnclave: addresses.mockEnclave as `0x${string}`,
  mockEnclaveAdapter: addresses.mockEnclaveAdapter as `0x${string}`,
  mockE3Program: addresses.mockE3Program as `0x${string}`,
  mockCiphernodeRegistry: addresses.mockCiphernodeRegistry as `0x${string}`,
  mockDecryptionVerifier: addresses.mockDecryptionVerifier as `0x${string}`,
  crispVotingSidecar: addresses.crispVotingSidecar as `0x${string}`,
  nounsCrispProgram: addresses.nounsCrispProgram as `0x${string}`,
  nounsAuctionHouseV4: addresses.nounsAuctionHouseV4 as `0x${string}`,
  nounsAuctionHouseV4Proxy: addresses.nounsAuctionHouseV4Proxy as `0x${string}`,
  nounsVickreyProgram: addresses.nounsVickreyProgram as `0x${string}`,
};

export function getLocalInterfoldAddresses(chainId: number): LocalInterfoldAddresses | null {
  return chainId === LOCAL_INTERFOLD_CHAIN_ID ? LOCAL_INTERFOLD_ADDRESSES : null;
}

export function getSidecarAddress(chainId: number): `0x${string}` | undefined {
  return getLocalInterfoldAddresses(chainId)?.crispVotingSidecar;
}

export function getV4AuctionAddress(chainId: number): `0x${string}` | undefined {
  return getLocalInterfoldAddresses(chainId)?.nounsAuctionHouseV4Proxy;
}
