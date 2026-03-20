// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IReenterCallback {
    function reenterCallback() external;
}

/// @dev Simulates a token with an ERC777-style hook or any custom callback on transfer.
/// Used exclusively for testing reentrancy guards in OTC.
contract MaliciousERC20 is ERC20 {
    address public hook;
    bool public hookActive;

    constructor(uint256 initialSupply) ERC20("MalToken", "MAL") {
        _mint(msg.sender, initialSupply);
    }

    function setHook(address _hook) external {
        hook = _hook;
        hookActive = true;
    }

    /// @dev Fires AFTER the actual transfer, simulating a post-transfer receive hook.
    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);

        if (hookActive && to == hook) {
            hookActive = false; // prevent infinite recursion
            IReenterCallback(to).reenterCallback();
        }
    }
}

