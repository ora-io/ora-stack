import type { ethers } from 'ethers'
import type { RekProviderManager } from '../provider'

export type Providers = ethers.WebSocketProvider | ethers.JsonRpcProvider | RekProviderManager
