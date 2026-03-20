import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import MockWETHModule from "./MockWETH.js";

/// Local module: first deploys MockWETH, then OTC pointing at it.
/// Requires no parameters — suited for Hardhat Network and localhost.
///
///   npx hardhat ignition deploy ignition/modules/LocalOTC.ts
///
/// OTC is automatically wired to the freshly deployed MockWETH via
/// m.useModule, so Ignition resolves the address dependency in the
/// correct execution order.
export default buildModule("LocalOTC", (m) => {
  const { mockWeth } = m.useModule(MockWETHModule);

  const otc = m.contract("OTC", [mockWeth]);

  return { otc, mockWeth };
});

