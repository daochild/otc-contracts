export const OTC_ABI = [
  // ─── Reads ───────────────────────────────────────────────────────────────
  {
    name: 'totalTrades',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'trades',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'remainingWantAmount', type: 'uint256' },
      { name: 'remainingGiveAmount', type: 'uint256' },
      { name: 'giveToken', type: 'address' },
      { name: 'giveAmount', type: 'uint256' },
      { name: 'wantToken', type: 'address' },
      { name: 'wantAmount', type: 'uint256' },
      { name: 'timeout', type: 'uint256' },
    ],
  },
  {
    name: 'WETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ─── Writes ──────────────────────────────────────────────────────────────
  {
    name: 'createTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_giveToken', type: 'address' },
      { name: '_giveAmount', type: 'uint256' },
      { name: '_wantToken', type: 'address' },
      { name: '_wantAmount', type: 'uint256' },
      { name: '_deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'createTradeFromETH',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_wantToken', type: 'address' },
      { name: '_wantAmount', type: 'uint256' },
      { name: '_deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'fillTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_id', type: 'uint256' },
      { name: '_fillAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'fillTradeInETH',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelTrade',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_id', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelTrades',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_ids', type: 'uint256[]' }],
    outputs: [],
  },
  // ─── Events ──────────────────────────────────────────────────────────────
  {
    name: 'TradeCreated',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'tradeID', type: 'uint256', indexed: true },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TradePartiallyFilled',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'tradeID', type: 'uint256', indexed: true },
      { name: 'giveToken', type: 'address', indexed: false },
      { name: 'giveAmount', type: 'uint256', indexed: false },
      { name: 'wantToken', type: 'address', indexed: false },
      { name: 'wantAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TradeFullyFilled',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'tradeID', type: 'uint256', indexed: true },
      { name: 'giveToken', type: 'address', indexed: false },
      { name: 'giveAmount', type: 'uint256', indexed: false },
      { name: 'wantToken', type: 'address', indexed: false },
      { name: 'wantAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TradeCancelled',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'tradeID', type: 'uint256', indexed: true },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

