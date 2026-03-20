'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useTrades } from '@/lib/hooks/useTrades'
import { TradeCard } from './TradeCard'
import { FillTradeModal } from './FillTradeModal'
import { type Trade } from '@/types'
import { OTC_ABI } from '@/lib/abi'
import { OTC_ADDRESS, IS_DEMO } from '@/lib/config'

function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-24 rounded-lg bg-gray-800" />
        <div className="flex-1 h-4 rounded bg-gray-800" />
        <div className="h-10 w-24 rounded-lg bg-gray-800" />
      </div>
      <div className="h-3 w-full rounded bg-gray-800 mb-2" />
      <div className="flex justify-between">
        <div className="h-3 w-32 rounded bg-gray-800" />
        <div className="h-7 w-20 rounded-lg bg-gray-800" />
      </div>
    </div>
  )
}

type TabId = 'all' | 'mine'

export function TradeList({ onCreateTrade }: { onCreateTrade: () => void }) {
  const { address } = useAccount()
  const { trades, isLoading, isDemo } = useTrades()
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [tab, setTab] = useState<TabId>('all')

  const { writeContract, data: cancelTxHash } = useWriteContract()
  useWaitForTransactionReceipt({ hash: cancelTxHash })

  const now = BigInt(Math.floor(Date.now() / 1000))
  const activeTrades = trades.filter(t => t.timeout > now)

  const visibleTrades =
    tab === 'mine' && address
      ? activeTrades.filter(t => t.creator.toLowerCase() === address.toLowerCase())
      : activeTrades

  function handleCancel(trade: Trade) {
    if (IS_DEMO) { alert('Demo: cancel disabled'); return }
    writeContract({
      address: OTC_ADDRESS,
      abi: OTC_ABI,
      functionName: 'cancelTrade',
      args: [trade.id],
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex rounded-xl border border-white/10 bg-gray-900 p-1 text-sm">
          {(['all', 'mine'] as TabId[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 font-medium transition ${
                tab === t ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'all' ? 'All Trades' : 'My Trades'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isDemo && <span className="text-amber-400">Demo data</span>}
          <span>{activeTrades.length} active</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : visibleTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
            </svg>
          </div>
          <div>
            <p className="text-gray-300 font-medium">No active trades</p>
            <p className="text-gray-600 text-sm mt-1">
              {tab === 'mine' ? 'You have no open trades.' : 'Be the first to create one.'}
            </p>
          </div>
          <button
            onClick={onCreateTrade}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
          >
            Create Trade
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTrades.map(trade => (
            <TradeCard
              key={trade.id.toString()}
              trade={trade}
              onFill={setSelectedTrade}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <FillTradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </>
  )
}
