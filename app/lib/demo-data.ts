import type { Trade } from '@/types'

// Mainnet addresses (read-only demo — no real funds)
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`
const DAI  = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as `0x${string}`
const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as `0x${string}`

const now = BigInt(Math.floor(Date.now() / 1000))

export const DEMO_TRADES: Trade[] = [
  {
    id: 1n,
    creator: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    giveToken: WETH,
    wantToken: USDC,
    giveAmount: 5_000_000_000_000_000_000n,          // 5 WETH
    wantAmount: 17_500_000_000n,                       // 17 500 USDC (6 dec)
    remainingGiveAmount: 5_000_000_000_000_000_000n,
    remainingWantAmount: 17_500_000_000n,
    timeout: now + 86400n * 3n,
  },
  {
    id: 2n,
    creator: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    giveToken: WBTC,
    wantToken: USDT,
    giveAmount: 100_000_000n,                          // 1 WBTC (8 dec)
    wantAmount: 62_000_000_000n,                       // 62 000 USDT (6 dec)
    remainingGiveAmount: 60_000_000n,                  // 0.6 WBTC remaining
    remainingWantAmount: 37_200_000_000n,
    timeout: now + 86400n * 7n,
  },
  {
    id: 3n,
    creator: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    giveToken: DAI,
    wantToken: USDC,
    giveAmount: 100_000_000_000_000_000_000_000n,      // 100 000 DAI (18 dec)
    wantAmount: 99_500_000_000n,                        // 99 500 USDC (6 dec)
    remainingGiveAmount: 100_000_000_000_000_000_000_000n,
    remainingWantAmount: 99_500_000_000n,
    timeout: now + 86400n * 1n,
  },
  {
    id: 4n,
    creator: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
    giveToken: USDC,
    wantToken: WETH,
    giveAmount: 50_000_000_000n,                       // 50 000 USDC
    wantAmount: 14_285_714_285_714_285_714n,           // ~14.28 WETH
    remainingGiveAmount: 50_000_000_000n,
    remainingWantAmount: 14_285_714_285_714_285_714n,
    timeout: now + 86400n * 14n,
  },
  {
    id: 5n,
    creator: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
    giveToken: WETH,
    wantToken: DAI,
    giveAmount: 10_000_000_000_000_000_000n,           // 10 WETH
    wantAmount: 35_000_000_000_000_000_000_000n,       // 35 000 DAI
    remainingGiveAmount: 4_000_000_000_000_000_000n,   // 4 WETH remaining
    remainingWantAmount: 14_000_000_000_000_000_000_000n,
    timeout: now + 86400n * 2n,
  },
]

