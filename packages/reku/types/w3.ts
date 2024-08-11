import type { ethers } from 'ethers'
import type { RekuProviderManager } from '../provider'

export type Providers = ethers.WebSocketProvider | ethers.JsonRpcProvider | RekuProviderManager
