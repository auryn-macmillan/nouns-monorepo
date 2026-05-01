// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import 'forge-std/Test.sol';
import { NounsAuctionHouseProxy } from '../../contracts/proxies/NounsAuctionHouseProxy.sol';
import { NounsAuctionHouseProxyAdmin } from '../../contracts/proxies/NounsAuctionHouseProxyAdmin.sol';
import { NounsAuctionHouseV3 } from '../../contracts/NounsAuctionHouseV3.sol';
import { NounsAuctionHouseV4 } from '../../contracts/NounsAuctionHouseV4.sol';
import { INounsToken } from '../../contracts/interfaces/INounsToken.sol';
import { ChainalysisSanctionsListMock } from './helpers/ChainalysisSanctionsListMock.sol';
import { NounsTokenLikeMock } from './helpers/NounsTokenLikeMock.sol';

contract NounsAuctionHouseV4UpgradeTest is Test {
    function test_proxyAdminUpgradePreservesV3StateAndEnablesV4() public {
        NounsTokenLikeMock token = new NounsTokenLikeMock();
        NounsAuctionHouseProxyAdmin proxyAdmin = new NounsAuctionHouseProxyAdmin();
        NounsAuctionHouseV3 logicV3 = new NounsAuctionHouseV3(INounsToken(address(token)), address(0xBEEF), 1 days);
        ChainalysisSanctionsListMock sanctionsOracle = new ChainalysisSanctionsListMock();

        NounsAuctionHouseProxy proxy = new NounsAuctionHouseProxy(
            address(logicV3),
            address(proxyAdmin),
            abi.encodeWithSelector(
                NounsAuctionHouseV3.initialize.selector,
                uint192(1 ether),
                uint56(5 minutes),
                uint8(2),
                sanctionsOracle
            )
        );

        NounsAuctionHouseV3 auctionV3 = NounsAuctionHouseV3(address(proxy));
        auctionV3.setReservePrice(2 ether);
        auctionV3.setTimeBuffer(10 minutes);
        auctionV3.setMinBidIncrementPercentage(7);

        NounsAuctionHouseV4 logicV4 = new NounsAuctionHouseV4(
            INounsToken(address(token)),
            address(0xBEEF),
            1 days,
            0,
            2 ether
        );

        proxyAdmin.upgrade(proxy, address(logicV4));

        NounsAuctionHouseV4 auctionV4 = NounsAuctionHouseV4(address(proxy));

        assertEq(address(auctionV4.nouns()), address(token));
        assertEq(auctionV4.weth(), address(0xBEEF));
        assertEq(auctionV4.duration(), 1 days);
        assertEq(auctionV4.reservePrice(), 2 ether);
        assertEq(auctionV4.timeBuffer(), 10 minutes);
        assertEq(auctionV4.minBidIncrementPercentage(), 7);
        assertEq(auctionV4.owner(), address(this));
        assertEq(auctionV4.MIN_PRICE(), 0);
        assertEq(auctionV4.MAX_PRICE(), 2 ether);
    }
}
