// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IOTCFillInEth {
    function fillTradeInETH(uint256 _id) external payable;
}

contract RejectEthReceiver {
    function fillViaContract(address otc, uint256 id) external payable {
        IOTCFillInEth(otc).fillTradeInETH{value: msg.value}(id);
    }

    receive() external payable {
        revert("No refunds accepted");
    }
}

