//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NounsCrispProgram
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const nounsCrispProgramAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_sidecar",
        "type": "address"
      },
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
    "inputs": [],
    "name": "NotEnclave",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      }
    ],
    "name": "UnknownE3",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "TallyVerified",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ENCRYPTION_SCHEME_ID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
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
      }
    ],
    "name": "e3ToProposal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "enclave",
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
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sidecar",
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
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "params",
        "type": "bytes"
      }
    ],
    "name": "validate",
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
    "name": "verify",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const nounsCrispProgramAddress = {
  31337: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
} as const

export const nounsCrispProgramConfig = {
  address: nounsCrispProgramAddress,
  abi: nounsCrispProgramAbi,
} as const
