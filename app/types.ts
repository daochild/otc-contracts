export interface Trade {
  id: bigint
  creator: `0x${string}`
  giveToken: `0x${string}`
  wantToken: `0x${string}`
  giveAmount: bigint
  wantAmount: bigint
  remainingGiveAmount: bigint
  remainingWantAmount: bigint
  timeout: bigint
}

