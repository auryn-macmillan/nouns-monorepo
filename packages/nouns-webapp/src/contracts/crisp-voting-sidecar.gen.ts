//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CrispVotingSidecar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const crispVotingSidecarAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_governor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_enclave",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_nounsToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "AlreadyVoted",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "E3NotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMerkleProof",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum CrispVotingSidecar.Phase",
        "name": "expected",
        "type": "uint8"
      },
      {
        "internalType": "enum CrispVotingSidecar.Phase",
        "name": "actual",
        "type": "uint8"
      }
    ],
    "name": "InvalidPhase",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEnclave",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotGovernor",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TimeoutNotReached",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "forVotes",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "againstVotes",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "abstainVotes",
        "type": "uint96"
      }
    ],
    "name": "E3TallyDecrypted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "E3VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "E3VoteDecayed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      }
    ],
    "name": "E3VoteInitialized",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "encryptedVote",
        "type": "bytes"
      },
      {
        "internalType": "bytes32[]",
        "name": "merkleProof",
        "type": "bytes32[]"
      },
      {
        "internalType": "uint96",
        "name": "votingPower",
        "type": "uint96"
      }
    ],
    "name": "castE3Vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "e3States",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "e3Id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "enum CrispVotingSidecar.Phase",
        "name": "phase",
        "type": "uint8"
      },
      {
        "internalType": "uint96",
        "name": "forVotes",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "againstVotes",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "abstainVotes",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "e3Timeout",
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
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "forceDecay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "governor",
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
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "voter",
        "type": "address"
      }
    ],
    "name": "hasSubmittedE3Vote",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      }
    ],
    "name": "initializeE3Vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "isE3Proposal",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nounsToken",
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
        "name": "",
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
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "uint96",
        "name": "forVotes",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "againstVotes",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "abstainVotes",
        "type": "uint96"
      }
    ],
    "name": "setE3Tally",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "",
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
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
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
    "stateMutability": "pure",
    "type": "function"
  }
] as const

export const crispVotingSidecarAddress = {
  1: '0x0000000000000000000000000000000000000000',
  31337: '0x4826533B4897376654Bb4d4AD88B7faFD0C98528',
  11155111: '0x0000000000000000000000000000000000000000',
} as const

export const crispVotingSidecarConfig = {
  address: crispVotingSidecarAddress,
  abi: crispVotingSidecarAbi,
} as const
