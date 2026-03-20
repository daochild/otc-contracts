'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { OTC_ABI, ERC20_ABI } from '@/lib/abi'
import { OTC_ADDRESS, IS_DEMO } from '@/lib/config'
import { KNOWN_TOKENS, parseAmount } from '@/lib/tokens'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'idle' | 'approving' | 'creating' | 'done' | 'error'

const TOKEN_OPTIONS = Object.values(KNOWN_TOKENS).filter(t => !t.symbol.startsWith('WETH') || t.symbol === 'WETH')

const DEFAULT_DEADLINE_DAYS = 3

export function CreateTradeModal({ open, onClose }: Props) {
  const { address } = useAccount()
  const [giveToken, setGiveToken] = useState<string>(TOKEN_OPTIONS[0]?.address ?? '')
  const [wantToken, setWantToken] = useState<string>(TOKEN_OPTIONS[1]?.address ?? '')
  const [giveAmt, setGiveAmt] = useState('')
  const [wantAmt, setWantAmt] = useState('')
  const [deadlineDays, setDeadlineDays] = useState(DEFAULT_DEADLINE_DAYS)
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (txConfirmed) {
      if (step === 'approving') setStep('idle')
      else if (step === 'creating') setStep('done')
    }
  }, [txConfirmed, step])

  if (!open) return null

  const giveMeta = KNOWN_TOKENS[giveToken.toLowerCase()]
  const wantMeta = KNOWN_TOKENS[wantToken.toLowerCase()]

  const giveRaw = giveMeta ? parseAmount(giveAmt, giveMeta.decimals) : 0n
  const wantRaw = wantMeta ? parseAmount(wantAmt, wantMeta.decimals) : 0n

  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 86400)

  const canSubmit = giveToken !== wantToken && giveRaw > 0n && wantRaw > 0n

  async function handleApprove() {
    if (!giveToken || !canSubmit || IS_DEMO) return
    setStep('approving')
    setErrorMsg('')
    try {
      writeContract({
        address: giveToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [OTC_ADDRESS, giveRaw],
      })
    } catch (e: unknown) {
      setStep('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleCreate() {
    if (!canSubmit) return
    if (IS_DEMO) { setStep('done'); return }
    setStep('creating')
    setErrorMsg('')
    try {
      writeContract({
        address: OTC_ADDRESS,
        abi: OTC_ABI,
        functionName: 'createTrade',
        args: [
          giveToken as `0x${string}`,
          giveRaw,
          wantToken as `0x${string}`,
          wantRaw,
          deadline,
        ],
      })
    } catch (e: unknown) {
      setStep('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  function handleClose() {
    setStep('idle')
    setErrorMsg('')
    setGiveAmt('')
    setWantAmt('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create OTC Trade</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition">
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
            <p className="text-sm text-gray-300">
              {IS_DEMO ? 'Demo trade created!' : 'Trade created successfully!'}
            </p>
            <button onClick={handleClose} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Give */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">You give (escrow)</label>
              <div className="flex gap-2">
                <select
                  value={giveToken}
                  onChange={e => setGiveToken(e.target.value)}
                  className="w-28 rounded-lg border border-white/10 bg-gray-800 px-2 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {TOKEN_OPTIONS.map(t => (
                    <option key={t.address} value={t.address}>{t.symbol}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={giveAmt}
                  onChange={e => setGiveAmt(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 rounded-lg border border-white/10 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Want */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">You want</label>
              <div className="flex gap-2">
                <select
                  value={wantToken}
                  onChange={e => setWantToken(e.target.value)}
                  className="w-28 rounded-lg border border-white/10 bg-gray-800 px-2 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {TOKEN_OPTIONS.map(t => (
                    <option key={t.address} value={t.address}>{t.symbol}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={wantAmt}
                  onChange={e => setWantAmt(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 rounded-lg border border-white/10 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              {giveToken === wantToken && (
                <p className="text-xs text-red-400">Give and want tokens must differ</p>
              )}
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Expires in</label>
              <div className="flex gap-2">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDeadlineDays(d)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                      deadlineDays === d
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <p className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {errorMsg}
              </p>
            )}

            {!address && !IS_DEMO && (
              <p className="text-center text-sm text-gray-500">Connect wallet to create a trade</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-gray-400 hover:border-white/30 hover:text-white transition"
              >
                Cancel
              </button>
              {IS_DEMO ? (
                <button
                  onClick={handleCreate}
                  disabled={!canSubmit}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  Create (Demo)
                </button>
              ) : (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={!canSubmit || !address || step === 'approving'}
                    className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
                  >
                    {step === 'approving' ? 'Approving…' : '1. Approve'}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!canSubmit || !address || step === 'creating'}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {step === 'creating' ? 'Creating…' : '2. Create'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

