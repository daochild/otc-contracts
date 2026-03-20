'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { type Trade } from '@/types'
import { OTC_ABI, ERC20_ABI } from '@/lib/abi'
import { OTC_ADDRESS, IS_DEMO } from '@/lib/config'
import { getTokenMeta, formatAmount } from '@/lib/tokens'

interface Props {
  trade: Trade | null
  onClose: () => void
}

type Step = 'idle' | 'approving' | 'filling' | 'done' | 'error'

export function FillTradeModal({ trade, onClose }: Props) {
  const { address } = useAccount()
  const [fillInput, setFillInput] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  const wantMeta = trade ? getTokenMeta(trade.wantToken) : null
  const giveMeta = trade ? getTokenMeta(trade.giveToken) : null

  // Allowance check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: trade?.wantToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && OTC_ADDRESS ? [address, OTC_ADDRESS] : undefined,
    query: { enabled: !!trade && !!address && !!OTC_ADDRESS && !IS_DEMO },
  })

  useEffect(() => {
    if (txConfirmed) {
      if (step === 'approving') {
        refetchAllowance()
        setStep('idle')
      } else if (step === 'filling') {
        setStep('done')
      }
    }
  }, [txConfirmed, step, refetchAllowance])

  if (!trade) return null

  const decimals = wantMeta?.decimals ?? 18
  const fillRaw = fillInput
    ? (() => { try { return parseUnits(fillInput, decimals) } catch { return 0n } })()
    : 0n

  const maxFill = trade.remainingWantAmount
  const cappedFill = fillRaw > maxFill ? maxFill : fillRaw

  // Pro-rata output
  const outputRaw = cappedFill === maxFill
    ? trade.remainingGiveAmount
    : trade.giveAmount > 0n
      ? cappedFill * trade.giveAmount / trade.wantAmount
      : 0n

  const needsApproval = !IS_DEMO && allowance !== undefined && allowance < cappedFill

  function handleSetMax() {
    setFillInput(formatAmount(maxFill, decimals))
  }

  async function handleApprove() {
    if (!trade || IS_DEMO) return
    setStep('approving')
    setErrorMsg('')
    try {
      writeContract({
        address: trade.wantToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [OTC_ADDRESS, cappedFill],
      })
    } catch (e: unknown) {
      setStep('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleFill() {
    if (!trade) return
    if (IS_DEMO) { setStep('done'); return }
    setStep('filling')
    setErrorMsg('')
    try {
      writeContract({
        address: OTC_ADDRESS,
        abi: OTC_ABI,
        functionName: 'fillTrade',
        args: [trade.id, cappedFill],
      })
    } catch (e: unknown) {
      setStep('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Fill Trade #{trade.id.toString()}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'done' ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-center text-sm text-gray-300">
              {IS_DEMO ? 'Demo fill successful!' : 'Trade filled successfully!'}
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Trade summary */}
            <div className="mb-4 rounded-xl bg-gray-800/60 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">You provide</span>
                <span className="text-white font-medium">… {wantMeta?.symbol ?? trade.wantToken.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">You receive</span>
                <span className="text-green-400 font-medium">… {giveMeta?.symbol ?? trade.giveToken.slice(0, 8)}</span>
              </div>
            </div>

            {/* Amount input */}
            <div className="mb-4 space-y-1.5">
              <label className="text-xs text-gray-400">
                Amount to provide ({wantMeta?.symbol ?? 'tokens'})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={fillInput}
                  onChange={e => setFillInput(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 rounded-lg border border-white/10 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleSetMax}
                  className="rounded-lg border border-white/10 bg-gray-800 px-3 py-2.5 text-xs text-blue-400 hover:border-blue-500"
                >
                  Max
                </button>
              </div>
              {cappedFill > 0n && (
                <p className="text-xs text-gray-500">
                  You receive ≈{' '}
                  <span className="text-green-400 font-medium">
                    {giveMeta ? formatAmount(outputRaw, giveMeta.decimals) : outputRaw.toString()}{' '}
                    {giveMeta?.symbol}
                  </span>
                </p>
              )}
            </div>

            {errorMsg && (
              <p className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {errorMsg}
              </p>
            )}

            {!address && !IS_DEMO && (
              <p className="mb-4 text-center text-sm text-gray-500">Connect wallet to fill this trade</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-gray-400 hover:border-white/30 hover:text-white transition"
              >
                Cancel
              </button>
              {(IS_DEMO || !!address) && (
                needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={cappedFill === 0n || step === 'approving'}
                    className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                  >
                    {step === 'approving' ? 'Approving…' : `Approve ${wantMeta?.symbol}`}
                  </button>
                ) : (
                  <button
                    onClick={handleFill}
                    disabled={cappedFill === 0n || step === 'filling'}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {step === 'filling' ? 'Filling…' : 'Fill Trade'}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

