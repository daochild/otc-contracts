'use client'

import { ConnectButton } from './ConnectButton'
import { IS_DEMO } from '@/lib/config'

export function Header({ onCreateTrade }: { onCreateTrade: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-sm">
            OTC
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Finup</span>
            <span className="ml-1 text-lg font-light text-blue-400">OTC</span>
          </div>
          {IS_DEMO && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">
              DEMO
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCreateTrade}
            className="hidden sm:flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Trade
          </button>
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}

