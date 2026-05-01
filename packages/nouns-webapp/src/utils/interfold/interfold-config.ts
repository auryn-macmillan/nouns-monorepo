import {
  getLocalInterfoldAddresses,
  getSidecarAddress,
  getV4AuctionAddress,
} from './local-interfold-addresses';

export interface InterfoldConfig {
  enclaveAddress: `0x${string}`;
  sidecarAddress?: `0x${string}`;
  v4AuctionAddress?: `0x${string}`;
  isTestnet: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const FALLBACK_ENCLAVE_ADDRESS = '0x0000000000000000000000000000000000000001';

function getLocalEnclaveAddress(chainId: number): `0x${string}` {
  const enclaveAddress = getLocalInterfoldAddresses(chainId)?.mockEnclave;

  return enclaveAddress && enclaveAddress !== ZERO_ADDRESS
    ? enclaveAddress
    : FALLBACK_ENCLAVE_ADDRESS;
}

const CONFIGS: Record<number, InterfoldConfig> = {
  11155111: { enclaveAddress: '0x0000000000000000000000000000000000000000', isTestnet: true },
  1: { enclaveAddress: '0x0000000000000000000000000000000000000000', isTestnet: false },
};

export function getInterfoldConfig(chainId: number): InterfoldConfig {
  if (chainId === 31337) {
    return {
      enclaveAddress: getLocalEnclaveAddress(chainId),
      sidecarAddress: getSidecarAddress(chainId),
      v4AuctionAddress: getV4AuctionAddress(chainId),
      isTestnet: true,
    };
  }

  return CONFIGS[chainId] ?? CONFIGS[1];
}
