import { defineConfig } from "hardhat/config";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

export default defineConfig({
  plugins: [hardhatKeystore, hardhatToolboxMochaEthers],
  solidity: {
	version: "0.8.28",
	settings: {
	  optimizer: {
		enabled: true,
		runs: 10000,
	  },
	},
  },
  defaultNetwork: "hardhat",
  networks: {
	hardhat: {
	  type: "edr-simulated",
	  chainType: "l1",
	  allowUnlimitedContractSize: false,
	},
	ethereum: {
	  type: "http",
	  chainType: "l1",
	  url: process.env.ETHEREUM_URL ?? "",
	  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
	},
	goerli: {
	  type: "http",
	  chainType: "l1",
	  url: process.env.GOERLI_URL ?? "",
	  accounts: process.env.PRIVATE_KEY_DEV ? [process.env.PRIVATE_KEY_DEV] : [],
	},
  },
  etherscan: {
	apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
});
