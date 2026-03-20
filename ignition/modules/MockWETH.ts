import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/// @dev Deploys MockWETH for local / Hardhat Network testing.
/// Not for production — on live networks use the canonical WETH address.
export default buildModule("MockWETH", (m) => {
  const mockWeth = m.contract("MockWETH");

  return { mockWeth };
});

