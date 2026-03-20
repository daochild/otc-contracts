'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { TradeList } from '@/components/TradeList';
import { CreateTradeModal } from '@/components/CreateTradeModal';

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Header onCreateTrade={() => setCreateOpen(true)} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Hero */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            OTC Order Book
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Permissionless peer-to-peer ERC-20 swaps · no intermediary · partial fills supported
          </p>
        </div>

        <TradeList onCreateTrade={() => setCreateOpen(true)} />
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-700">
        Finup OTC — open-source, non-custodial
      </footer>

      <CreateTradeModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
