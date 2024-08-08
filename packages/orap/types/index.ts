import type { ProviderManager } from '@ora-io/rek'
import type { ethers } from 'ethers'

export type Providers = ethers.WebSocketProvider | ethers.JsonRpcProvider | ProviderManager
