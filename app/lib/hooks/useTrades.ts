'use client'

import { useReadContract, useReadContracts } from 'wagmi'
import { OTC_ABI } from '@/lib/abi'
import { OTC_ADDRESS, IS_DEMO } from '@/lib/config'
import { DEMO_TRADES } from '@/lib/demo-data'
import type { Trade } from '@/types'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function useTrades() {
  // ─── Demo mode ───────────────────────────────────────────────────────────
  const { data: total } = useReadContract({
    address: OTC_ADDRESS || undefined,
    abi: OTC_ABI,
    functionName: 'totalTrades',
    query: { enabled: !IS_DEMO && !!OTC_ADDRESS },
  })

  const count = Number(total ?? 0n)

  const { data: rawTrades, isLoading } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: OTC_ADDRESS,
      abi: OTC_ABI,
      functionName: 'trades' as const,
      args: [BigInt(i + 1)] as const,
    })),
    query: { enabled: !IS_DEMO && !!OTC_ADDRESS && count > 0 },
  })

  if (IS_DEMO) {
    return { trades: DEMO_TRADES, isLoading: false, isDemo: true }
  }

  const trades: Trade[] = []
  if (rawTrades) {
    for (let i = 0; i < rawTrades.length; i++) {
      const result = rawTrades[i]
      if (result.status !== 'success' || !result.result) continue
      const [creator, remainingWantAmount, remainingGiveAmount, giveToken, giveAmount, wantToken, wantAmount, timeout] = result.result as [
        `0x${string}`, bigint, bigint, `0x${string}`, bigint, `0x${string}`, bigint, bigint
      ]
      // Skip empty/cancelled trades
      if (creator === ZERO_ADDRESS) continue
      trades.push({
        id: BigInt(i + 1),
        creator,
        remainingWantAmount,
        remainingGiveAmount,
        giveToken,
        giveAmount,
        wantToken,
        wantAmount,
        timeout,
      })
    }
  }

  return { trades, isLoading: isLoading && count > 0, isDemo: false }
}

