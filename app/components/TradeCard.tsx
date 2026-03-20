'use client'

import { type Trade } from '@/types'
import { getTokenMeta, formatAmount } from '@/lib/tokens'
import { useAccount } from 'wagmi'

interface Props {
  trade: Trade
  onFill: (trade: Trade) => void
  onCancel: (trade: Trade) => void
}

function TokenBadge({ address, amount }: { address: `0x${string}`; amount: bigint }) {
  const meta = getTokenMeta(address)
  const symbol = meta?.symbol ?? `${address.slice(0, 6)}…`
  const formatted = meta ? formatAmount(amount, meta.decimals) : '?'
  return (
    <div className="flex flex-col">
      <span className="text-xl font-bold text-white">{formatted}</span>
      <span className="text-sm font-medium text-blue-400">{symbol}</span>
    </div>
  )
}

function TimeLeft({ timeout }: { timeout: bigint }) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const diff = timeout - now
  if (diff <= 0n) return <span className="text-red-400 text-xs">Expired</span>

  const days = Number(diff / 86400n)
  const hours = Number((diff % 86400n) / 3600n)
  const mins = Number((diff % 3600n) / 60n)

  if (days > 0) return <span className="text-gray-400 text-xs">{days}d {hours}h left</span>
  if (hours > 0) return <span className="text-yellow-400 text-xs">{hours}h {mins}m left</span>
  return <span className="text-red-400 text-xs">{mins}m left</span>
}

export function TradeCard({ trade, onFill, onCancel }: Props) {
  const { address } = useAccount()

  const isOwner = address && address.toLowerCase() === trade.creator.toLowerCase()
  const isExpired = trade.timeout <= BigInt(Math.floor(Date.now() / 1000))

  // Fill progress
  const filled = trade.wantAmount > 0n
    ? Number((trade.wantAmount - trade.remainingWantAmount) * 10000n / trade.wantAmount) / 100
    : 0
  const fillPct = Math.min(filled, 100)

  const giveMeta = getTokenMeta(trade.giveToken)
  const wantMeta = getTokenMeta(trade.wantToken)

  // Price: how much wantToken per 1 giveToken
  const rate = giveMeta && wantMeta && trade.giveAmount > 0n
    ? formatAmount(trade.wantAmount * 10n ** BigInt(giveMeta.decimals) / trade.giveAmount, wantMeta.decimals)
    : null

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-gray-900 p-5 transition hover:border-blue-500/40 hover:bg-gray-900/80">
      {/* ID badge */}
      <div className="absolute right-4 top-4 text-xs text-gray-600">#{trade.id.toString()}</div>

      {/* Token swap row */}
      <div className="flex items-center gap-3">
        <TokenBadge address={trade.giveToken} amount={trade.remainingGiveAmount} />
        <div className="flex flex-col items-center gap-1 flex-1">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          {rate && (
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              1 {giveMeta?.symbol} = {rate} {wantMeta?.symbol}
            </span>
          )}
        </div>
        <div className="text-right">
          <TokenBadge address={trade.wantToken} amount={trade.remainingWantAmount} />
        </div>
      </div>

      {/* Progress bar */}
      {fillPct > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Filled</span>
            <span>{fillPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-800">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-[9px] text-gray-400">
              {trade.creator.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {trade.creator.slice(0, 6)}…{trade.creator.slice(-4)}
          </span>
          <span className="text-gray-700">·</span>
          <TimeLeft timeout={trade.timeout} />
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => onCancel(trade)}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
            >
              Cancel
            </button>
          )}
          {!isOwner && !isExpired && (
            <button
              onClick={() => onFill(trade)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 active:scale-95"
            >
              Fill Trade
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

