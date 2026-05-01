// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { MerkleProof } from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import { PausableUpgradeable } from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import { ReentrancyGuardUpgradeable } from '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import { OwnableUpgradeable } from '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IE3Enclave } from './interfaces/IE3Enclave.sol';
import { IE3Program } from './interfaces/IE3Program.sol';
import { INounsAuctionHouseV4 } from './interfaces/INounsAuctionHouseV4.sol';
import { INounsToken } from './interfaces/INounsToken.sol';
import { IWETH } from './interfaces/IWETH.sol';
import { IChainalysisSanctionsList } from './external/chainalysis/IChainalysisSanctionsList.sol';

contract NounsAuctionHouseV4 is
    INounsAuctionHouseV4,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable
{
    struct VickreyAuctionData {
        bytes32 e3Id;
        bytes32 merkleRoot;
        Phase phase;
        uint32 bidCount;
        uint32 decodedAt;
        uint256 secondPriceBucket;
        uint128 secondPrice;
        address payable winner;
        bool zeroBids;
    }

    uint56 public constant MAX_TIME_BUFFER = 1 days;
    uint256 public constant PRICE_LADDER_BUCKETS = 256;

    INounsToken public immutable nouns;
    address public immutable weth;
    uint256 public immutable duration;
    uint256 public immutable MIN_PRICE;
    uint256 public immutable MAX_PRICE;

    uint192 public reservePrice;
    uint56 public timeBuffer;
    uint8 public minBidIncrementPercentage;
    AuctionV2 public auctionStorage;
    mapping(uint256 => SettlementState) settlementHistory;
    IChainalysisSanctionsList public sanctionsOracle;

    IE3Enclave public enclave;
    IE3Program public program;
    bytes32 public bidderMerkleRoot;
    bool public v4Initialized;

    mapping(uint256 nounId => VickreyAuctionData data) internal vickreyAuctions;
    mapping(bytes32 e3Id => uint256 nounId) public e3ToAuction;
    mapping(uint256 nounId => mapping(address bidder => bool)) public hasSubmittedSealedBid;
    mapping(uint256 nounId => address[] bidders) internal auctionBidders;

    error AuctionNotUpForSealedBids();
    error AuctionExpired();
    error AuctionStillRunning();
    error AuctionAlreadySettled();
    error AuctionResultPending();
    error InvalidPhase(Phase expected, Phase actual);
    error InvalidCollateral();
    error AlreadySubmitted(address bidder, uint256 nounId);
    error InvalidMerkleProof();
    error OnlyProgram();
    error UnknownAuction(uint256 nounId);
    error InvalidWinner(address winner);
    error InvalidSecondPriceBucket(uint256 bucket);
    error LegacyEnglishBidsDisabled();
    error VickreyConfigurationImmutable();
    error ActiveLegacyAuction();
    error V4AlreadyInitialized();

    constructor(INounsToken _nouns, address _weth, uint256 _duration, uint256 _minPrice, uint256 _maxPrice) initializer {
        require(_maxPrice >= _minPrice, 'invalid price range');
        nouns = _nouns;
        weth = _weth;
        duration = _duration;
        MIN_PRICE = _minPrice;
        MAX_PRICE = _maxPrice;
    }

    function initialize(
        uint192 _reservePrice,
        uint56 _timeBuffer,
        uint8 _minBidIncrementPercentage,
        IChainalysisSanctionsList _sanctionsOracle
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init();

        _pause();

        reservePrice = _reservePrice;
        timeBuffer = _timeBuffer;
        minBidIncrementPercentage = _minBidIncrementPercentage;
        sanctionsOracle = _sanctionsOracle;

        emit SanctionsOracleSet(address(_sanctionsOracle));
    }

    function initializeV4(address _enclave, address _program, bytes32 _bidderMerkleRoot) external onlyOwner {
        if (v4Initialized) revert V4AlreadyInitialized();
        if (auctionStorage.startTime != 0 && !auctionStorage.settled) revert ActiveLegacyAuction();

        enclave = IE3Enclave(_enclave);
        program = IE3Program(_program);
        bidderMerkleRoot = _bidderMerkleRoot;
        reservePrice = uint192(MIN_PRICE);
        v4Initialized = true;
    }

    function settleCurrentAndCreateNewAuction() external override whenNotPaused {
        _settleAuction();
        _createAuction();
    }

    function settleAuction() external override whenPaused {
        _settleAuction();
    }

    function submitSealedBid(
        uint256 nounId,
        bytes calldata encryptedBid,
        bytes32[] calldata merkleProof
    ) external payable whenNotPaused nonReentrant {
        AuctionV2 memory _auction = auctionStorage;
        if (_auction.nounId != nounId) revert AuctionNotUpForSealedBids();
        if (_auction.settled) revert AuctionAlreadySettled();
        if (block.timestamp >= _auction.endTime) revert AuctionExpired();
        if (msg.value != MAX_PRICE) revert InvalidCollateral();
        if (hasSubmittedSealedBid[nounId][msg.sender]) revert AlreadySubmitted(msg.sender, nounId);

        _requireNotSanctioned(msg.sender);

        VickreyAuctionData storage auctionData = vickreyAuctions[nounId];
        if (auctionData.phase != Phase.Bidding) revert InvalidPhase(Phase.Bidding, auctionData.phase);

        if (auctionData.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            if (!MerkleProof.verify(merkleProof, auctionData.merkleRoot, leaf)) revert InvalidMerkleProof();
        }

        hasSubmittedSealedBid[nounId][msg.sender] = true;
        auctionBidders[nounId].push(msg.sender);
        auctionData.bidCount += 1;

        enclave.publishInput(auctionData.e3Id, encryptedBid);

        emit SealedBidSubmitted(nounId, msg.sender);
    }

    function createBid(uint256) external payable override {
        revert LegacyEnglishBidsDisabled();
    }

    function createBid(uint256, uint32) public payable override {
        revert LegacyEnglishBidsDisabled();
    }

    function onAuctionResultDecoded(
        uint256 nounId,
        uint256 secondPriceBucket,
        address winner,
        bool zeroBids
    ) external override {
        if (msg.sender != address(program)) revert OnlyProgram();

        AuctionV2 memory _auction = auctionStorage;
        if (_auction.startTime == 0 || _auction.nounId != nounId) revert UnknownAuction(nounId);
        if (_auction.settled) revert AuctionAlreadySettled();
        if (block.timestamp < _auction.endTime) revert AuctionStillRunning();

        VickreyAuctionData storage auctionData = vickreyAuctions[nounId];
        _transitionToComputing(auctionData, _auction.endTime);

        if (secondPriceBucket > PRICE_LADDER_BUCKETS) revert InvalidSecondPriceBucket(secondPriceBucket);

        auctionData.phase = Phase.Revealed;
        auctionData.zeroBids = zeroBids;
        auctionData.decodedAt = uint32(block.timestamp);
        auctionData.secondPriceBucket = secondPriceBucket;

        if (zeroBids) {
            auctionData.winner = payable(address(0));
            auctionData.secondPrice = 0;
        } else {
            if (!hasSubmittedSealedBid[nounId][winner]) revert InvalidWinner(winner);
            auctionData.winner = payable(winner);
            auctionData.secondPrice = uint128(_resolveSecondPrice(auctionData.bidCount, secondPriceBucket));
            auctionStorage.amount = auctionData.secondPrice;
            auctionStorage.bidder = payable(winner);
        }

        emit AuctionResultDecoded(nounId, secondPriceBucket, winner, zeroBids);
    }

    function auction() external view returns (AuctionV2View memory) {
        AuctionV2 memory _auction = auctionStorage;
        VickreyAuctionData memory auctionData = vickreyAuctions[_auction.nounId];

        return
            AuctionV2View({
                nounId: _auction.nounId,
                amount: auctionData.phase == Phase.Revealed ? auctionData.secondPrice : 0,
                startTime: _auction.startTime,
                endTime: _auction.endTime,
                bidder: auctionData.phase == Phase.Revealed ? auctionData.winner : payable(address(0)),
                settled: _auction.settled
            });
    }

    function currentPhase() external view returns (Phase) {
        AuctionV2 memory _auction = auctionStorage;
        if (_auction.startTime == 0 || _auction.settled) {
            return Phase.Revealed;
        }

        VickreyAuctionData memory auctionData = vickreyAuctions[_auction.nounId];
        if (auctionData.phase == Phase.Bidding && block.timestamp >= _auction.endTime) {
            return Phase.Computing;
        }
        return auctionData.phase;
    }

    function getVickreyAuction(uint256 nounId) external view returns (VickreyAuctionView memory) {
        VickreyAuctionData memory auctionData = vickreyAuctions[nounId];
        return
            VickreyAuctionView({
                nounId: nounId,
                e3Id: auctionData.e3Id,
                merkleRoot: auctionData.merkleRoot,
                phase: auctionData.phase,
                bidCount: auctionData.bidCount,
                secondPriceBucket: auctionData.secondPriceBucket,
                secondPrice: auctionData.secondPrice,
                winner: auctionData.winner,
                zeroBids: auctionData.zeroBids
            });
    }

    function pause() external override onlyOwner {
        _pause();
    }

    function unpause() external override onlyOwner {
        _unpause();

        if (auctionStorage.startTime == 0 || auctionStorage.settled) {
            _createAuction();
        }
    }

    function setTimeBuffer(uint56 _timeBuffer) external override onlyOwner {
        require(_timeBuffer <= MAX_TIME_BUFFER, 'timeBuffer too large');
        timeBuffer = _timeBuffer;
        emit AuctionTimeBufferUpdated(_timeBuffer);
    }

    function setReservePrice(uint192 _reservePrice) external override onlyOwner {
        if (_reservePrice != MIN_PRICE) revert VickreyConfigurationImmutable();
        reservePrice = _reservePrice;
        emit AuctionReservePriceUpdated(_reservePrice);
    }

    function setMinBidIncrementPercentage(uint8 _minBidIncrementPercentage) external override onlyOwner {
        minBidIncrementPercentage = _minBidIncrementPercentage;
        emit AuctionMinBidIncrementPercentageUpdated(_minBidIncrementPercentage);
    }

    function setSanctionsOracle(address newSanctionsOracle) public override onlyOwner {
        sanctionsOracle = IChainalysisSanctionsList(newSanctionsOracle);
        emit SanctionsOracleSet(newSanctionsOracle);
    }

    function setPrices(SettlementNoClientId[] memory settlements) external onlyOwner {
        for (uint256 i = 0; i < settlements.length; ++i) {
            SettlementState storage settlementState = settlementHistory[settlements[i].nounId];
            settlementState.blockTimestamp = settlements[i].blockTimestamp;
            settlementState.amount = ethPriceToUint64(settlements[i].amount);
            settlementState.winner = settlements[i].winner;
        }
    }

    function warmUpSettlementState(uint256 startId, uint256 endId) external override {
        for (uint256 i = startId; i < endId; ++i) {
            if (i <= 1820 && i % 10 == 0) continue;

            SettlementState storage settlementState = settlementHistory[i];
            if (settlementState.blockTimestamp == 0) {
                settlementState.blockTimestamp = 1;
                settlementState.slotWarmedUp = true;
            }
        }
    }

    function getSettlements(
        uint256 auctionCount,
        bool skipEmptyValues
    ) external view override returns (Settlement[] memory settlements) {
        uint256 latestNounId = auctionStorage.nounId;
        if (!auctionStorage.settled && latestNounId > 0) {
            latestNounId -= 1;
        }

        settlements = new Settlement[](auctionCount);
        uint256 actualCount = 0;

        SettlementState memory settlementState;
        for (uint256 id = latestNounId; actualCount < auctionCount; --id) {
            settlementState = settlementHistory[id];

            if (skipEmptyValues && settlementState.blockTimestamp <= 1) {
                if (id == 0) break;
                continue;
            }

            settlements[actualCount] = Settlement({
                blockTimestamp: settlementState.blockTimestamp,
                amount: uint64PriceToUint256(settlementState.amount),
                winner: settlementState.winner,
                nounId: id,
                clientId: settlementState.clientId
            });
            ++actualCount;

            if (id == 0) break;
        }

        if (auctionCount > actualCount) {
            assembly {
                mstore(settlements, actualCount)
            }
        }
    }

    function getPrices(uint256 auctionCount) external view override returns (uint256[] memory prices) {
        uint256 latestNounId = auctionStorage.nounId;
        if (!auctionStorage.settled && latestNounId > 0) {
            latestNounId -= 1;
        }

        prices = new uint256[](auctionCount);
        uint256 actualCount = 0;

        SettlementState memory settlementState;
        for (uint256 id = latestNounId; id > 0 && actualCount < auctionCount; --id) {
            if (id <= 1820 && id % 10 == 0) continue;

            settlementState = settlementHistory[id];
            require(settlementState.blockTimestamp > 1, 'Missing data');
            if (settlementState.winner == address(0)) continue;

            prices[actualCount] = uint64PriceToUint256(settlementState.amount);
            ++actualCount;
        }

        require(auctionCount == actualCount, 'Not enough history');
    }

    function getSettlementsFromIdtoTimestamp(
        uint256 startId,
        uint256 endTimestamp,
        bool skipEmptyValues
    ) public view override returns (Settlement[] memory settlements) {
        uint256 maxId = auctionStorage.nounId;
        require(startId <= maxId, 'startId too large');
        settlements = new Settlement[](maxId - startId + 1);
        uint256 actualCount = 0;
        SettlementState memory settlementState;
        for (uint256 id = startId; id <= maxId; ++id) {
            settlementState = settlementHistory[id];

            if (skipEmptyValues && settlementState.blockTimestamp <= 1) continue;
            if ((id == maxId) && (settlementState.blockTimestamp <= 1)) continue;
            if (settlementState.blockTimestamp > endTimestamp) break;

            settlements[actualCount] = Settlement({
                blockTimestamp: settlementState.blockTimestamp,
                amount: uint64PriceToUint256(settlementState.amount),
                winner: settlementState.winner,
                nounId: id,
                clientId: settlementState.clientId
            });
            ++actualCount;
        }

        if (settlements.length > actualCount) {
            assembly {
                mstore(settlements, actualCount)
            }
        }
    }

    function getSettlements(
        uint256 startId,
        uint256 endId,
        bool skipEmptyValues
    ) external view override returns (Settlement[] memory settlements) {
        settlements = new Settlement[](endId - startId);
        uint256 actualCount = 0;

        SettlementState memory settlementState;
        for (uint256 id = startId; id < endId; ++id) {
            settlementState = settlementHistory[id];

            if (skipEmptyValues && settlementState.blockTimestamp <= 1) continue;

            settlements[actualCount] = Settlement({
                blockTimestamp: settlementState.blockTimestamp,
                amount: uint64PriceToUint256(settlementState.amount),
                winner: settlementState.winner,
                nounId: id,
                clientId: settlementState.clientId
            });
            ++actualCount;
        }

        if (settlements.length > actualCount) {
            assembly {
                mstore(settlements, actualCount)
            }
        }
    }

    function biddingClient(uint256 nounId) external view override returns (uint32) {
        return settlementHistory[nounId].clientId;
    }

    function _createAuction() internal {
        try nouns.mint() returns (uint256 nounId) {
            uint40 startTime = uint40(block.timestamp);
            uint40 endTime = startTime + uint40(duration);
            bytes32 e3Id = enclave.request(
                IE3Enclave.RequestParams({ program: address(program), params: abi.encode(nounId, bidderMerkleRoot) })
            );

            auctionStorage = AuctionV2({
                nounId: uint96(nounId),
                clientId: 0,
                amount: 0,
                startTime: startTime,
                endTime: endTime,
                bidder: payable(0),
                settled: false
            });

            vickreyAuctions[nounId] = VickreyAuctionData({
                e3Id: e3Id,
                merkleRoot: bidderMerkleRoot,
                phase: Phase.Bidding,
                bidCount: 0,
                decodedAt: 0,
                secondPriceBucket: 0,
                secondPrice: 0,
                winner: payable(address(0)),
                zeroBids: false
            });
            e3ToAuction[e3Id] = nounId;

            emit AuctionCreated(nounId, startTime, endTime);
        } catch Error(string memory) {
            _pause();
        }
    }

    function _settleAuction() internal nonReentrant {
        AuctionV2 memory _auction = auctionStorage;

        require(_auction.startTime != 0, "Auction hasn't begun");
        if (_auction.settled) revert AuctionAlreadySettled();
        if (block.timestamp < _auction.endTime) revert AuctionStillRunning();

        VickreyAuctionData storage auctionData = vickreyAuctions[_auction.nounId];
        _transitionToComputing(auctionData, _auction.endTime);
        if (auctionData.phase != Phase.Revealed) revert AuctionResultPending();

        auctionStorage.settled = true;

        if (auctionData.zeroBids || auctionData.bidCount == 0) {
            nouns.burn(_auction.nounId);
        } else {
            nouns.transferFrom(address(this), auctionData.winner, _auction.nounId);
            _safeTransferETHWithFallback(owner(), auctionData.secondPrice);
        }

        address[] storage bidders = auctionBidders[_auction.nounId];
        for (uint256 i = 0; i < bidders.length; ++i) {
            address bidder = bidders[i];
            uint256 refundAmount = bidder == auctionData.winner ? MAX_PRICE - auctionData.secondPrice : MAX_PRICE;
            if (refundAmount > 0) {
                _safeTransferETHWithFallback(bidder, refundAmount);
            }
        }

        SettlementState storage settlementState = settlementHistory[_auction.nounId];
        settlementState.blockTimestamp = uint32(block.timestamp);
        settlementState.amount = ethPriceToUint64(auctionData.secondPrice);
        settlementState.winner = auctionData.winner;

        emit AuctionSettled(_auction.nounId, auctionData.winner, auctionData.secondPrice);
    }

    function _transitionToComputing(VickreyAuctionData storage auctionData, uint40 endTime) internal {
        if (auctionData.phase == Phase.Bidding && block.timestamp >= endTime) {
            auctionData.phase = Phase.Computing;
        }
    }

    function _resolveSecondPrice(uint256 bidCount, uint256 secondPriceBucket) internal view returns (uint256) {
        if (bidCount == 1) {
            return MIN_PRICE;
        }
        return MIN_PRICE + ((secondPriceBucket * (MAX_PRICE - MIN_PRICE)) / PRICE_LADDER_BUCKETS);
    }

    function _safeTransferETHWithFallback(address to, uint256 amount) internal {
        if (!_safeTransferETH(to, amount)) {
            IWETH(weth).deposit{ value: amount }();
            IERC20(weth).transfer(to, amount);
        }
    }

    function _safeTransferETH(address to, uint256 value) internal returns (bool) {
        bool success;
        assembly {
            success := call(30000, to, value, 0, 0, 0, 0)
        }
        return success;
    }

    function _requireNotSanctioned(address account) internal view {
        IChainalysisSanctionsList sanctionsOracle_ = sanctionsOracle;
        if (address(sanctionsOracle_) != address(0)) {
            require(!sanctionsOracle_.isSanctioned(account), 'Sanctioned bidder');
        }
    }

    function ethPriceToUint64(uint256 ethPrice) internal pure returns (uint64) {
        return uint64(ethPrice / 1e8);
    }

    function uint64PriceToUint256(uint64 price) internal pure returns (uint256) {
        return uint256(price) * 1e8;
    }
}
