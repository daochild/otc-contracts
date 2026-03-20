import { cookieStorage, createStorage } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia } from '@reown/appkit/networks'

export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? 'demo-project-id'

export const networks = [mainnet, sepolia]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

// OTC contract address — set NEXT_PUBLIC_OTC_ADDRESS for production
export const OTC_ADDRESS = (process.env.NEXT_PUBLIC_OTC_ADDRESS ?? '') as `0x${string}`

// When no address is configured, fall back to demo data
export const IS_DEMO = !process.env.NEXT_PUBLIC_OTC_ADDRESS

