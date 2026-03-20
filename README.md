# finup-otc

Decentralized peer-to-peer OTC trading on EVM chains.  
Permissionless ERC-20 and ETH/WETH swaps with partial fills, deadlines, and no intermediary.

## Architecture

```
contracts/
├── OTC.sol                     # Core trading contract (split config/state storage)
├── interfaces/
│   └── IWETH.sol               # WETH interface (deposit / withdraw / transfer)
└── test/
    ├── MockERC20.sol           # Mintable ERC-20 for tests
    ├── MockWETH.sol            # WETH mock for local tests
    ├── BatchTradeFiller.sol    # Test helper: fill multiple trades in one tx
    ├── MaliciousERC20.sol      # Reentrancy audit helper
    ├── CancelReentrantCreator.sol
    └── RejectEthReceiver.sol

ignition/
├── modules/
│   ├── MockWETH.ts             # Deploy MockWETH (local only)
│   ├── OTC.ts                  # Deploy OTC with external WETH (production)
│   └── LocalOTC.ts             # Deploy MockWETH → OTC in one module (local)
├── parameters.goerli.json
└── parameters.mainnet.json

scripts/
└── deploy.ts                   # Script-based deploy (auto-selects module by network)
```

### Storage model

`OTC.sol` uses a gas-optimized split layout instead of one large `Trade` struct:

- `TradeConfig` — immutable order terms (`creator`, `giveToken`, `wantToken`, `giveAmount`, `wantAmount`, `timeout`)
- `TradeState` — mutable execution state (`remainingWantAmount`, `remainingGiveAmount`)
- `trades(id)` is kept as a compatibility getter that reconstructs the old read shape for scripts/tests

This keeps fills cheaper because only mutable state is updated during partial fills.

Amounts are stored internally as `uint128`, deadlines as `uint64`, with explicit bounds checks on creation.

### Trade lifecycle

| Step | Function | Who |
|---|---|---|
| Create | `createTrade` / `createTradeFromETH` | Creator — escrows `giveToken` |
| Fill | `fillTrade` / `fillTradeInETH` | Filler — partial or full, ETH overfill refunded |
| Cancel | `cancelTrade` / `cancelTrades` | Creator — returns unfilled `giveToken` |

## Setup

```bash
npm install
```

Create a `.env` file for live networks:

```env
ETHEREUM_URL=https://mainnet.infura.io/v3/...
PRIVATE_KEY=0x...

GOERLI_URL=https://goerli.infura.io/v3/...
PRIVATE_KEY_DEV=0x...

ETHERSCAN_API_KEY=...
```

## Development

### Compile

```bash
npm run build
```

### Test

```bash
npm test
```

Current TypeScript coverage includes:

- ERC20 create / fill / partial fill / final fill
- ETH/WETH create and fill flows
- overfill refund handling
- `cancelTrade` and `cancelTrades`
- multi-trade fill in one transaction
- reentrancy regression test for cancellation
- expiry and invalid-operation custom errors

Gas report:

```bash
REPORT_GAS=true npm test
```

### Local node

```bash
npm run node
```

## Deployment

### Via script (auto-detects network)

```bash
# Hardhat Network (deploys MockWETH automatically)
npm run deploy

# Goerli  (uses WETH 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6)
npm run deploy:goerli

# Mainnet (uses WETH 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
npm run deploy:mainnet
```

### Via Hardhat Ignition (recommended for production)

**Local** — deploys MockWETH and OTC in two batches, no parameters required:

```bash
npm run ignition:local
# or
npx hardhat ignition deploy ignition/modules/LocalOTC.ts
```

**Goerli**:

```bash
npm run ignition:goerli
# or
npx hardhat ignition deploy ignition/modules/OTC.ts \
  --network goerli \
  --parameters ignition/parameters.goerli.json
```

**Mainnet**:

```bash
npm run ignition:mainnet
# or
npx hardhat ignition deploy ignition/modules/OTC.ts \
  --network ethereum \
  --parameters ignition/parameters.mainnet.json
```

> To add a new network: create `ignition/parameters.<network>.json` with the WETH address
> and add the network entry to `hardhat.config.ts`.

### Ignition parameter files

```json
// ignition/parameters.goerli.json
{ "OTC": { "weth": "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6" } }

// ignition/parameters.mainnet.json
{ "OTC": { "weth": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" } }
```

### Check deployment status

```bash
npx hardhat ignition deployments
npx hardhat ignition status chain-<chainId>
```

### Resume a failed deployment

Re-run the same command with the same `--network` — Ignition picks up from the last
successful batch automatically.

## Security

- **ReentrancyGuardTransient** (EIP-1153) on all state-changing functions
- **CEI pattern** enforced: storage is cleared before any external call
- **Custom errors** throughout — cheaper and more informative than `require` strings
- **Split config/state storage** — immutable pricing metadata is separated from mutable fill balances

| Error | Condition |
|---|---|
| `ZeroAddress` | WETH address is zero in constructor |
| `InvalidToken` | Token address is zero or WETH where not allowed |
| `SameToken` | `giveToken == wantToken` |
| `ZeroAmount` | Any amount argument is zero |
| `AmountTooLarge` | Amount doesn't fit into internal `uint128` storage |
| `InvalidDeadline` | Deadline ≤ current timestamp |
| `DeadlineTooLarge` | Deadline doesn't fit into internal `uint64` storage |
| `TradeNotFound` | Trade ID does not exist |
| `TradeExpired` | `block.timestamp > trade.timeout` |
| `TradeNotETH` | `fillTradeInETH` called on non-WETH trade |
| `NotTradeOwner` | `cancelTrade` called by non-creator |
| `RefundFailed` | ETH overfill refund rejected by recipient |
