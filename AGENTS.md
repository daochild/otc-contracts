# AGENTS.md - finup-otc

## Project overview

`finup-otc` is a Hardhat 3 Solidity project for peer-to-peer OTC token swaps on EVM chains.
The core contract is `contracts/OTC.sol`, which supports:
- ERC20 -> ERC20 trades via `createTrade` / `fillTrade`
- ETH -> ERC20 creation via `createTradeFromETH`
- ETH settlement for WETH-denominated wants via `fillTradeInETH`
- single and batch cancellation via `cancelTrade` / `cancelTrades`

## Architecture that matters

- `OTC.sol` uses **split storage** instead of one large struct:
  - `TradeConfig` = immutable trade terms (`creator`, tokens, original amounts, timeout)
  - `TradeState` = mutable execution state (`remainingWantAmount`, `remainingGiveAmount`)
- `trades(id)` is a compatibility getter that reconstructs the old 8-field tuple for scripts/tests.
- Partial fills use the current invariant:
  - normal fill: `sold = fillAmount * giveAmount / wantAmount`
  - final fill: transfer all `remainingGiveAmount` to avoid rounding dust.
- WETH address is constructor-injected and returned by `WETH()`.

## Security / contract conventions

- All state-changing entrypoints are protected by `ReentrancyGuardTransient`.
- Follow **checks -> effects -> interactions** strictly; storage is deleted before external transfers on full fill/cancel.
- Token transfers must use `SafeERC20`; do not switch to raw `transfer` / `transferFrom`.
- Errors use **custom errors**, not revert strings.
- Token addresses are stored as `address`; cast to `IERC20` only at the interaction point.
- Amounts are bounded to `uint128`, deadlines to `uint64`; preserve the bound checks when adding new entrypoints or fields.

## Important files

- `contracts/OTC.sol` - production contract
- `contracts/interfaces/IWETH.sol` - minimal WETH interface
- `contracts/test/MockERC20.sol` / `MockWETH.sol` - test tokens
- `contracts/test/BatchTradeFiller.sol` - fills multiple trades in one tx (test helper)
- `contracts/test/MaliciousERC20.sol`, `CancelReentrantCreator.sol`, `RejectEthReceiver.sol` - security/regression helpers
- `test/OTC.test.ts` - main Hardhat 3 Mocha/Ethers regression suite
- `ignition/modules/OTC.ts` / `LocalOTC.ts` - Ignition deployment modules
- `scripts/deploy.ts` - script wrapper around Ignition deployments

## Developer workflows

```bash
npm install
npm run build
npm test
REPORT_GAS=true npm test
npm run node
```

Deployment:

```bash
npm run deploy
npm run deploy:goerli
npm run deploy:mainnet
npm run ignition:local
npm run ignition:goerli
npm run ignition:mainnet
```

## Testing expectations

When changing trade math or state transitions, update `fillTrade` and `fillTradeInETH` together and extend `test/OTC.test.ts`.
Existing tests already cover:
- create / partial / full fill
- ETH/WETH flows and refunds
- multi-trade fill in one tx
- `cancelTrade` and `cancelTrades`
- expiry and custom-error reverts
- cancellation reentrancy regression

## Guidance for future changes

- If you optimize storage further, preserve `trades(id)` unless you intentionally want to break read compatibility.
- If you add batch features, keep them atomic unless there is a clear product reason for partial success semantics.
- If you consider scaling beyond on-chain escrow, the next architectural step is an off-chain signed-order model; do not mix that into the current contract incrementally.
