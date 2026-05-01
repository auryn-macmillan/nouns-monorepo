//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MockEnclave
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const mockEnclaveAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "E3NotRequested",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "internalType": "enum MockEnclave.Phase",
        "name": "expected",
        "type": "uint8"
      },
      {
        "internalType": "enum MockEnclave.Phase",
        "name": "actual",
        "type": "uint8"
      }
    ],
    "name": "InvalidPhase",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProgram",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrancy",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "VerifyFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "publicKey",
        "type": "bytes"
      }
    ],
    "name": "CommitteePublicKeyPublished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "requester",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "program",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "params",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "committeePublicKey",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "plaintextOutput",
            "type": "bytes"
          }
        ],
        "indexed": false,
        "internalType": "struct MockEnclave.E3",
        "name": "e3",
        "type": "tuple"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "e3Program",
        "type": "address"
      }
    ],
    "name": "E3Requested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "inputHash",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "InputPublished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "plaintextOutput",
        "type": "bytes"
      }
    ],
    "name": "PlaintextOutputPublished",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "committeePublicKeys",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "e3States",
    "outputs": [
      {
        "internalType": "address",
        "name": "program",
        "type": "address"
      },
      {
        "internalType": "enum MockEnclave.Phase",
        "name": "phase",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "ciphertextCount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "tally",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "e3s",
    "outputs": [
      {
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "program",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "params",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "committeePublicKey",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "plaintextOutput",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getCiphertext",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
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
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "getE3State",
    "outputs": [
      {
        "internalType": "address",
        "name": "program",
        "type": "address"
      },
      {
        "internalType": "enum MockEnclave.Phase",
        "name": "phase",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "ciphertextCount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "tally",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextE3Id",
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
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "pubkey",
        "type": "bytes"
      }
    ],
    "name": "publishCommitteePublicKey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
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
        "name": "processedData",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "plaintext",
        "type": "bytes"
      }
    ],
    "name": "publishPlaintextOutput",
    "outputs": [],
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
        "internalType": "struct MockEnclave.RequestParams",
        "name": "requestParams",
        "type": "tuple"
      }
    ],
    "name": "request",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      }
    ],
    "name": "requestCompute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "e3Id",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "submitDecryption",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const mockEnclaveAddress = {
  1: '0x0000000000000000000000000000000000000000',
  31337: '0x851356ae760d987E095750cCeb3bC6014560891C',
  11155111: '0x0000000000000000000000000000000000000000',
} as const

export const mockEnclaveConfig = {
  address: mockEnclaveAddress,
  abi: mockEnclaveAbi,
} as const
