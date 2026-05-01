//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NounsAuctionHouseV4
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const nounsAuctionHouseV4Abi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_nouns",
        "type": "address",
        "internalType": "contract INounsToken"
      },
      {
        "name": "_weth",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_duration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_minPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_maxPrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_PRICE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TIME_BUFFER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint56",
        "internalType": "uint56"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_PRICE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PRICE_LADDER_BUCKETS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "auction",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct INounsAuctionHouseV3.AuctionV2View",
        "components": [
          {
            "name": "nounId",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "startTime",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTime",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "bidder",
            "type": "address",
            "internalType": "address payable"
          },
          {
            "name": "settled",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "auctionStorage",
    "inputs": [],
    "outputs": [
      {
        "name": "nounId",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "clientId",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "startTime",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "endTime",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "bidder",
        "type": "address",
        "internalType": "address payable"
      },
      {
        "name": "settled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "bidderMerkleRoot",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "biddingClient",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createBid",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "createBid",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "currentPhase",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum INounsAuctionHouseV4.Phase"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "duration",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "e3ToAuction",
    "inputs": [
      {
        "name": "e3Id",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "enclave",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IE3Enclave"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPrices",
    "inputs": [
      {
        "name": "auctionCount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "prices",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSettlements",
    "inputs": [
      {
        "name": "auctionCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "skipEmptyValues",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "settlements",
        "type": "tuple[]",
        "internalType": "struct INounsAuctionHouseV3.Settlement[]",
        "components": [
          {
            "name": "blockTimestamp",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nounId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "clientId",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSettlements",
    "inputs": [
      {
        "name": "startId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "skipEmptyValues",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "settlements",
        "type": "tuple[]",
        "internalType": "struct INounsAuctionHouseV3.Settlement[]",
        "components": [
          {
            "name": "blockTimestamp",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nounId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "clientId",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSettlementsFromIdtoTimestamp",
    "inputs": [
      {
        "name": "startId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "skipEmptyValues",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "settlements",
        "type": "tuple[]",
        "internalType": "struct INounsAuctionHouseV3.Settlement[]",
        "components": [
          {
            "name": "blockTimestamp",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nounId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "clientId",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getVickreyAuction",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct INounsAuctionHouseV4.VickreyAuctionView",
        "components": [
          {
            "name": "nounId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "e3Id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "phase",
            "type": "uint8",
            "internalType": "enum INounsAuctionHouseV4.Phase"
          },
          {
            "name": "bidCount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "secondPriceBucket",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "secondPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "zeroBids",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSubmittedSealedBid",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "bidder",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_reservePrice",
        "type": "uint192",
        "internalType": "uint192"
      },
      {
        "name": "_timeBuffer",
        "type": "uint56",
        "internalType": "uint56"
      },
      {
        "name": "_minBidIncrementPercentage",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "_sanctionsOracle",
        "type": "address",
        "internalType": "contract IChainalysisSanctionsList"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initializeV4",
    "inputs": [
      {
        "name": "_enclave",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_program",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_bidderMerkleRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "minBidIncrementPercentage",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nouns",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract INounsToken"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "onAuctionResultDecoded",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "secondPriceBucket",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "zeroBids",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "program",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IE3Program"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reservePrice",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint192",
        "internalType": "uint192"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "sanctionsOracle",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IChainalysisSanctionsList"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setMinBidIncrementPercentage",
    "inputs": [
      {
        "name": "_minBidIncrementPercentage",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPrices",
    "inputs": [
      {
        "name": "settlements",
        "type": "tuple[]",
        "internalType": "struct INounsAuctionHouseV3.SettlementNoClientId[]",
        "components": [
          {
            "name": "blockTimestamp",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nounId",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setReservePrice",
    "inputs": [
      {
        "name": "_reservePrice",
        "type": "uint192",
        "internalType": "uint192"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setSanctionsOracle",
    "inputs": [
      {
        "name": "newSanctionsOracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTimeBuffer",
    "inputs": [
      {
        "name": "_timeBuffer",
        "type": "uint56",
        "internalType": "uint56"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settleAuction",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settleCurrentAndCreateNewAuction",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitSealedBid",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "encryptedBid",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "merkleProof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "timeBuffer",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint56",
        "internalType": "uint56"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "v4Initialized",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "warmUpSettlementState",
    "inputs": [
      {
        "name": "startId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "endId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "weth",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AuctionBid",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "extended",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionBidWithClientId",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "clientId",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionCreated",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "startTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "endTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionExtended",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "endTime",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionMinBidIncrementPercentageUpdated",
    "inputs": [
      {
        "name": "minBidIncrementPercentage",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionReservePriceUpdated",
    "inputs": [
      {
        "name": "reservePrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionResultDecoded",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "secondPriceBucket",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "zeroBids",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionSettled",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionSettledWithClientId",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "clientId",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AuctionTimeBufferUpdated",
    "inputs": [
      {
        "name": "timeBuffer",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SanctionsOracleSet",
    "inputs": [
      {
        "name": "newSanctionsOracle",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SealedBidSubmitted",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "bidder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ActiveLegacyAuction",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadySubmitted",
    "inputs": [
      {
        "name": "bidder",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "AuctionAlreadySettled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionNotUpForSealedBids",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionResultPending",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionStillRunning",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidMerkleProof",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPhase",
    "inputs": [
      {
        "name": "expected",
        "type": "uint8",
        "internalType": "enum INounsAuctionHouseV4.Phase"
      },
      {
        "name": "actual",
        "type": "uint8",
        "internalType": "enum INounsAuctionHouseV4.Phase"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidSecondPriceBucket",
    "inputs": [
      {
        "name": "bucket",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidWinner",
    "inputs": [
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "LegacyEnglishBidsDisabled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyProgram",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownAuction",
    "inputs": [
      {
        "name": "nounId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "V4AlreadyInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VickreyConfigurationImmutable",
    "inputs": []
  }
] as const

export const nounsAuctionHouseV4Address = {
  1: '0x0000000000000000000000000000000000000000',
  31337: '0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00',
  11155111: '0x0000000000000000000000000000000000000000',
} as const

export const nounsAuctionHouseV4Config = {
  address: nounsAuctionHouseV4Address,
  abi: nounsAuctionHouseV4Abi,
} as const
