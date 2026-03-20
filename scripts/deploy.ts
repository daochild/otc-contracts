import hre from "hardhat";
import path from "path";
import { fileURLToPath } from "url";

import OTCModule from "../ignition/modules/OTC.js";
import LocalOTCModule from "../ignition/modules/LocalOTC.js";
import {WETH_BY_NETWORK} from "./configs.js";


// ESM-compatible __dirname equivalent (import.meta.dirname requires Node ≥ 21.2)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const connection = await hre.network.connect();
  const networkName = connection.networkName;
  const isLocal = networkName === "hardhat" || networkName === "localhost";

  // ── Local / Hardhat Network ───────────────────────────────────────────────
  if (isLocal) {
    console.log("Deploying to local Hardhat Network…");

    const { otc, mockWeth } = await connection.ignition.deploy(LocalOTCModule);

    console.log(`MockWETH : ${await mockWeth.getAddress()}`);
    console.log(`OTC      : ${await otc.getAddress()}`);
    return;
  }

  // ── Live network ─────────────────────────────────────────────────────────
  const weth = WETH_BY_NETWORK[networkName];

  if (weth === undefined) {
    throw new Error(
      `No WETH address configured for network "${networkName}".\n` +
      `  Option A: add it to WETH_BY_NETWORK in scripts/deploy.ts\n` +
      `  Option B: deploy via CLI with a parameters file:\n` +
      `    npx hardhat ignition deploy ignition/modules/OTC.ts \\\n` +
      `      --network ${networkName} \\\n` +
      `      --parameters ignition/parameters.<network>.json`,
    );
  }

  console.log(`Deploying OTC to "${networkName}" (WETH: ${weth})…`);

  // Parameters are passed inline — no JSON file required from the script.
  // For CLI deployments use --parameters ignition/parameters.<network>.json
  const { otc } = await connection.ignition.deploy(OTCModule, {
    parameters: { OTC: { weth } },
  });

  console.log(`OTC deployed to: ${await otc.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

