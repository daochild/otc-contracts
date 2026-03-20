// Well-known token metadata for mainnet & Sepolia
// Keyed by lowercase address

export interface TokenMeta {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export const KNOWN_TOKENS: Record<string, TokenMeta> = {
  // ─── Mainnet ─────────────────────────────────────────────────────────────
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    logoURI: 'https://token-icons.llamao.fi/icons/tokens/1/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  },
  // ─── Sepolia ─────────────────────────────────────────────────────────────
  '0xfff9976782d46cc05630d1f6ebab18b2324d6b14': {
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    symbol: 'WETH',
    name: 'Wrapped Ether (Sepolia)',
    decimals: 18,
  },
}

export function getTokenMeta(address: string): TokenMeta | undefined {
  return KNOWN_TOKENS[address.toLowerCase()]
}

/** Format a raw on-chain amount to a human-readable string */
export function formatAmount(raw: bigint, decimals: number, maxFrac = 6): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  if (frac === 0n) return whole.toString()
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

/** Parse a human-readable amount to raw bigint */
export function parseAmount(value: string, decimals: number): bigint {
  if (!value || isNaN(Number(value))) return 0n
  const [whole = '0', frac = ''] = value.split('.')
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || '0')
}

