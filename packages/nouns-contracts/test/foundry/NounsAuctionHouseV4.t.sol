// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import 'forge-std/Test.sol';
import { NounsAuctionHouseProxy } from '../../contracts/proxies/NounsAuctionHouseProxy.sol';
import { NounsAuctionHouseProxyAdmin } from '../../contracts/proxies/NounsAuctionHouseProxyAdmin.sol';
import { NounsAuctionHouseV3 } from '../../contracts/NounsAuctionHouseV3.sol';
import { NounsAuctionHouseV4 } from '../../contracts/NounsAuctionHouseV4.sol';
import { NounsToken } from '../../contracts/NounsToken.sol';
import { IWETH } from '../../contracts/interfaces/IWETH.sol';
import { INounsAuctionHouseV4 } from '../../contracts/interfaces/INounsAuctionHouseV4.sol';
import { IE3Enclave } from '../../contracts/interfaces/IE3Enclave.sol';
import { INounsDescriptorMinimal } from '../../contracts/interfaces/INounsDescriptorMinimal.sol';
import { IChainalysisSanctionsList } from '../../contracts/external/chainalysis/IChainalysisSanctionsList.sol';
import { IProxyRegistry } from '../../contracts/external/opensea/IProxyRegistry.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { INounsToken } from '../../contracts/interfaces/INounsToken.sol';
import { INounsSeeder } from '../../contracts/interfaces/INounsSeeder.sol';
import { MockEnclave } from '../../contracts/mocks/Interfold/MockEnclave.sol';
import { NounsVickreyProgram } from '../../contracts/NounsVickreyProgram.sol';
import { WETH } from '../../contracts/test/WETH.sol';

contract MockDescriptor is INounsDescriptorMinimal {
    function tokenURI(uint256, INounsSeeder.Seed memory) external pure returns (string memory) {
        return '';
    }

    function dataURI(uint256, INounsSeeder.Seed memory) external pure returns (string memory) {
        return '';
    }

    function backgroundCount() external pure returns (uint256) {
        return 1;
    }

    function bodyCount() external pure returns (uint256) {
        return 1;
    }

    function accessoryCount() external pure returns (uint256) {
        return 1;
    }

    function headCount() external pure returns (uint256) {
        return 1;
    }

    function glassesCount() external pure returns (uint256) {
        return 1;
    }
}

contract MockSeeder is INounsSeeder {
    function generateSeed(uint256, INounsDescriptorMinimal) external pure returns (Seed memory) {
        return Seed({ background: 0, body: 0, accessory: 0, head: 0, glasses: 0 });
    }
}

contract MockProxyRegistry is IProxyRegistry {
    function proxies(address) external pure returns (address) {
        return address(0);
    }
}

contract TestEnclave is IE3Enclave {
    uint256 public nextE3Id;
    mapping(uint256 => uint256) public ciphertextCounts;

    function request(RequestParams calldata) external returns (bytes32 e3Id) {
        e3Id = bytes32(nextE3Id++);
    }

    function publishInput(bytes32 e3Id, bytes calldata) external returns (bytes memory) {
        ciphertextCounts[uint256(e3Id)] += 1;
        return '';
    }

    function getCiphertextCount(bytes32 e3Id) external view returns (uint256) {
        return ciphertextCounts[uint256(e3Id)];
    }
}

contract NounsAuctionHouseV4Test is Test {
    uint256 internal constant DURATION = 1 days;
    uint256 internal constant MIN_PRICE = 1 ether;
    uint256 internal constant MAX_PRICE = 2 ether;
    bytes32 internal constant BIDDER_ROOT = bytes32(0);

    NounsToken internal token;
    NounsAuctionHouseV4 internal auction;
    MockEnclave internal enclave;
    TestEnclave internal testEnclave;
    NounsVickreyProgram internal program;
    MockDescriptor internal descriptor;
    MockSeeder internal seeder;

    address internal noundersDAO;
    address internal bidder1;
    address internal bidder2;
    address internal bidder3;

    function setUp() public {
        noundersDAO = makeAddr('nounders');
        bidder1 = makeAddr('bidder1');
        bidder2 = makeAddr('bidder2');
        bidder3 = makeAddr('bidder3');

        descriptor = new MockDescriptor();
        seeder = new MockSeeder();
        token = new NounsToken(noundersDAO, address(this), descriptor, seeder, IProxyRegistry(address(new MockProxyRegistry())));
        enclave = new MockEnclave();
        testEnclave = new TestEnclave();
        NounsAuctionHouseV4 logicV4 = new NounsAuctionHouseV4(INounsToken(address(token)), address(new WETH()), DURATION, MIN_PRICE, MAX_PRICE);
        NounsAuctionHouseProxy proxy = new NounsAuctionHouseProxy(
            address(logicV4),
            address(new NounsAuctionHouseProxyAdmin()),
            abi.encodeWithSelector(
                NounsAuctionHouseV4.initialize.selector,
                uint192(1 ether),
                uint56(5 minutes),
                uint8(2),
                IChainalysisSanctionsList(address(0))
            )
        );

        auction = NounsAuctionHouseV4(address(proxy));
        program = new NounsVickreyProgram(address(auction), address(enclave));

        auction.initializeV4(address(testEnclave), address(program), BIDDER_ROOT);

        token.setMinter(address(auction));

        auction.unpause();
    }

    function testNounsAuctionHouseV4VickreyAuctionLifecycle() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');
        _bid(bidder2, nounId, hex'02');
        _bid(bidder3, nounId, hex'03');

        vm.warp(auction.auction().endTime + 1);
        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Computing));

        mockReveal(nounId, 128, bidder2, false);
        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Revealed));

        auction.settleCurrentAndCreateNewAuction();

        assertEq(token.ownerOf(nounId), bidder2);
        assertEq(auction.auction().nounId, nounId + 1);
        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Bidding));
    }

    function testNounsAuctionHouseV4SubmitSealedBid() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'deadbeef');

        INounsAuctionHouseV4.VickreyAuctionView memory v = auction.getVickreyAuction(nounId);
        assertEq(v.bidCount, 1);
        assertEq(uint256(v.phase), uint256(INounsAuctionHouseV4.Phase.Bidding));
        assertEq(auction.hasSubmittedSealedBid(nounId, bidder1), true);
        assertEq(testEnclave.getCiphertextCount(bytes32(0)), 1);
    }

    function testNounsAuctionHouseV4SettleAuction() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');
        _bid(bidder2, nounId, hex'02');

        vm.warp(auction.auction().endTime + 1);
        mockReveal(nounId, 64, bidder2, false);

        uint256 ownerWethBefore = IERC20(auction.weth()).balanceOf(address(this));
        uint256 winnerBefore = bidder2.balance;

        auction.settleCurrentAndCreateNewAuction();

        uint256 secondPrice = MIN_PRICE + ((64 * (MAX_PRICE - MIN_PRICE)) / 256);
        assertEq(token.ownerOf(nounId), bidder2);
        assertEq(IERC20(auction.weth()).balanceOf(address(this)), ownerWethBefore + secondPrice);
        assertEq(bidder2.balance, winnerBefore + (MAX_PRICE - secondPrice));
        assertEq(auction.getVickreyAuction(nounId).secondPrice, secondPrice);
    }

    function testNounsAuctionHouseV4ZeroBidsBurnNoun() public {
        uint256 nounId = auction.auction().nounId;

        vm.warp(auction.auction().endTime + 1);
        vm.prank(address(program));
        auction.onAuctionResultDecoded(nounId, 0, address(0), true);

        auction.settleCurrentAndCreateNewAuction();

        vm.expectRevert();
        token.ownerOf(nounId);
        assertEq(auction.getVickreyAuction(nounId).zeroBids, true);
    }

    function testNounsAuctionHouseV4CollateralRefund() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');
        _bid(bidder2, nounId, hex'02');

        vm.warp(auction.auction().endTime + 1);
        mockReveal(nounId, 192, bidder1, false);

        uint256 bidder1Before = bidder1.balance;
        uint256 bidder2Before = bidder2.balance;

        auction.settleCurrentAndCreateNewAuction();

        uint256 secondPrice = MIN_PRICE + ((192 * (MAX_PRICE - MIN_PRICE)) / 256);
        assertEq(bidder1.balance, bidder1Before + (MAX_PRICE - secondPrice));
        assertEq(bidder2.balance, bidder2Before + MAX_PRICE);
    }

    function testNounsAuctionHouseV4DoubleBidPrevented() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');

        vm.expectRevert(abi.encodeWithSelector(NounsAuctionHouseV4.AlreadySubmitted.selector, bidder1, nounId));
        _bid(bidder1, nounId, hex'02');
    }

    function testNounsAuctionHouseV4AuctionPhaseTransitions() public {
        uint256 nounId = auction.auction().nounId;

        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Bidding));
        _bid(bidder1, nounId, hex'01');

        vm.warp(auction.auction().endTime + 1);
        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Computing));

        mockReveal(nounId, 0, bidder1, false);
        assertEq(uint256(auction.currentPhase()), uint256(INounsAuctionHouseV4.Phase.Revealed));
    }

    function testNounsAuctionHouseV4ProxyUpgradeFromV3() public {
        NounsAuctionHouseProxyAdmin proxyAdmin = new NounsAuctionHouseProxyAdmin();
        NounsAuctionHouseV3 logicV3 = new NounsAuctionHouseV3(INounsToken(address(token)), address(new WETH()), DURATION);
        NounsAuctionHouseProxy proxy = new NounsAuctionHouseProxy(
            address(logicV3),
            address(proxyAdmin),
            abi.encodeWithSelector(
                NounsAuctionHouseV3.initialize.selector,
                uint192(1 ether),
                uint56(5 minutes),
                uint8(2),
                IChainalysisSanctionsList(address(0))
            )
        );

        NounsAuctionHouseV3 auctionV3 = NounsAuctionHouseV3(address(proxy));
        auctionV3.setReservePrice(1 ether);
        auctionV3.setTimeBuffer(10 minutes);
        auctionV3.setMinBidIncrementPercentage(7);

        NounsAuctionHouseV4 logicV4Upgrade = new NounsAuctionHouseV4(
            INounsToken(address(auctionV3.nouns())),
            auctionV3.weth(),
            auctionV3.duration(),
            0,
            2 ether
        );

        proxyAdmin.upgrade(proxy, address(logicV4Upgrade));

        NounsAuctionHouseV4 auctionV4 = NounsAuctionHouseV4(address(proxy));
        MockEnclave upgradeEnclave = new MockEnclave();
        NounsVickreyProgram upgradeProgram = new NounsVickreyProgram(address(auctionV4), address(upgradeEnclave));

        auctionV4.initializeV4(address(upgradeEnclave), address(upgradeProgram), bytes32(0));

        assertEq(address(auctionV4.nouns()), address(auctionV3.nouns()));
        assertEq(auctionV4.weth(), auctionV3.weth());
        assertEq(auctionV4.duration(), auctionV3.duration());
        assertEq(auctionV4.timeBuffer(), 10 minutes);
        assertEq(auctionV4.minBidIncrementPercentage(), 7);
        assertEq(auctionV4.MIN_PRICE(), 0);
        assertEq(auctionV4.MAX_PRICE(), 2 ether);
        assertEq(auctionV4.bidderMerkleRoot(), bytes32(0));
    }

    function testNounsAuctionHouseV4PriceLadderBucketConversion() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');
        _bid(bidder2, nounId, hex'02');

        vm.warp(auction.auction().endTime + 1);
        vm.prank(address(program));
        auction.onAuctionResultDecoded(nounId, 200, bidder2, false);

        uint256 expected = MIN_PRICE + ((200 * (MAX_PRICE - MIN_PRICE)) / 256);
        assertEq(auction.getVickreyAuction(nounId).secondPrice, expected);
    }

    function testNounsAuctionHouseV4BidOutsideBiddingPeriod() public {
        uint256 nounId = auction.auction().nounId;

        vm.warp(auction.auction().endTime + 1);
        vm.expectRevert(abi.encodeWithSelector(NounsAuctionHouseV4.AuctionExpired.selector));
        _bid(bidder1, nounId, hex'01');
    }

    function testNounsAuctionHouseV4SingleBidderPaysMinPrice() public {
        uint256 nounId = auction.auction().nounId;
        _bid(bidder1, nounId, hex'01');

        vm.warp(auction.auction().endTime + 1);
        mockReveal(nounId, 255, bidder1, false);

        uint256 bidderBefore = bidder1.balance;
        auction.settleCurrentAndCreateNewAuction();

        assertEq(auction.getVickreyAuction(nounId).secondPrice, MIN_PRICE);
        assertEq(bidder1.balance, bidderBefore + (MAX_PRICE - MIN_PRICE));
    }

    function testNounsAuctionHouseV4InvalidCollateralReverts() public {
        uint256 nounId = auction.auction().nounId;

        vm.deal(bidder1, MAX_PRICE);
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(NounsAuctionHouseV4.InvalidCollateral.selector));
        auction.submitSealedBid{ value: MAX_PRICE - 1 }(nounId, hex'01', new bytes32[](0));
    }

    function mockReveal(uint256 nounId, uint256 bucket, address winner, bool zeroBids) internal {
        vm.prank(address(program));
        auction.onAuctionResultDecoded(nounId, bucket, winner, zeroBids);
    }

    function _bid(address bidder, uint256 nounId, bytes memory encryptedBid) internal {
        vm.deal(bidder, MAX_PRICE);
        vm.prank(bidder);
        auction.submitSealedBid{ value: MAX_PRICE }(nounId, encryptedBid, new bytes32[](0));
    }
}
