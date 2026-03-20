// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library String {
	// @dev Returns roles hash.
	function getRoleHash(string calldata _role) public pure returns (bytes32 hash) {
		hash = keccak256(abi.encodePacked(_role));
	}
}
