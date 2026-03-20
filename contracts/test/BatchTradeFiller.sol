// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IOTCFill {
    function fillTrade(uint256 _id, uint256 _fillAmount) external;
}

contract BatchTradeFiller {
    function approveToken(IERC20 token, address spender, uint256 amount) external {
        token.approve(spender, amount);
    }

    function batchFill(address otc, uint256[] calldata ids, uint256[] calldata amounts) external {
        require(ids.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            IOTCFill(otc).fillTrade(ids[i], amounts[i]);
        }
    }
}

