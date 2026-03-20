// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IOTC {
    function createTrade(IERC20, uint256, IERC20, uint256, uint256) external returns (uint256);
    function cancelTrade(uint256) external;
}

/// @dev Attacker contract that is the trade creator and attempts to re-enter cancelTrade
/// during the giveToken transfer callback, simulating an ERC777-style reentrancy.
contract CancelReentrantCreator {
    IOTC public immutable otc;
    uint256 public tradeId;
    bool public reenterReverted;

    constructor(address _otc) {
        otc = IOTC(_otc);
    }

    function setupTrade(
        IERC20 giveToken,
        uint256 giveAmount,
        IERC20 wantToken,
        uint256 wantAmount,
        uint256 deadline
    ) external {
        giveToken.approve(address(otc), giveAmount);
        tradeId = otc.createTrade(giveToken, giveAmount, wantToken, wantAmount, deadline);
    }

    function attackCancel() external {
        otc.cancelTrade(tradeId);
    }

    /// @dev Called by MaliciousERC20 during transfer to this address.
    function reenterCallback() external {
        try otc.cancelTrade(tradeId) {
            // Reaching here means reentrancy succeeded — this is the unfixed scenario.
        } catch {
            reenterReverted = true;
        }
    }
}

