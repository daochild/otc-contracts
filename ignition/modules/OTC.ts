import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/// Production module: deploys OTC against an already-deployed WETH contract.
///
/// The "weth" parameter is required. Pass it via a parameters file:
///
///   npx hardhat ignition deploy ignition/modules/OTC.ts \
///     --network goerli \
///     --parameters ignition/parameters.json
///
/// Or inline from a script:
///
///   connection.ignition.deploy(OTCModule, {
///     parameters: { OTC: { weth: "0x..." } }
///   })
export default buildModule("OTC", (m) => {
  const weth = m.getParameter("weth");

  const otc = m.contract("OTC", [weth]);

  return { otc };
});

