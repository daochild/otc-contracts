// ─── WETH addresses keyed by Hardhat network name ────────────────────────────
// Add a new entry when deploying to a network not listed here,
// or skip this map entirely and pass --parameters <file> via the CLI.
export const WETH_BY_NETWORK: Record<string, string> = {
    ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    goerli:   "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
};
