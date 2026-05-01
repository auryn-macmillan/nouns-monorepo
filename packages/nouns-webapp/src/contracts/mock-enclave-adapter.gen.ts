//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockEnclaveAdapter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const mockEnclaveAdapterAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_enclave",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      }
    ],
    "name": "getCiphertextCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "publishInput",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "program",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "params",
            "type": "bytes"
          }
        ],
        "internalType": "struct IE3Enclave.RequestParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "request",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const mockEnclaveAdapterAddress = {
  1: '0x0000000000000000000000000000000000000000',
  31337: '0xf5059a5D33d5853360D16C683c16e67980206f36',
  11155111: '0x0000000000000000000000000000000000000000',
} as const

export const mockEnclaveAdapterConfig = {
  address: mockEnclaveAdapterAddress,
  abi: mockEnclaveAdapterAbi,
} as const
