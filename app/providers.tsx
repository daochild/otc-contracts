'use client'

import { ReactNode, useEffect, useState } from 'react'
import { WagmiProvider, type Config, cookieToInitialState } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { wagmiAdapter, projectId, networks } from '@/lib/config'

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: networks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  defaultNetwork: networks[0] as AppKitNetwork,
  metadata: {
    name: 'Finup OTC',
    description: 'Decentralized peer-to-peer OTC token trading',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://finup.io',
    icons: ['/favicon.ico'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px',
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  },
})

export function Providers({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  )

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {mounted ? children : null}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

