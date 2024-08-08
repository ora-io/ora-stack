/* eslint-disable no-console */
import { ethers } from 'ethers'
import { describe, expect, it, vi } from 'vitest'
import { AutoCrossChecker } from '../event/crosschecker/autochecker'
import { BaseCrossChecker } from '../event/crosschecker/basechecker'
import type { BaseCrossCheckParam } from '../event/crosschecker/interface'

const ETHEREUM_RPC_URL = 'https://rpc.ankr.com/eth'
const CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
export async function crossCheckerTest() {
  const rpcUrl = ETHEREUM_RPC_URL
  const provider = new ethers.JsonRpcProvider(rpcUrl)

  const onMissingLog = async (log: any) => {
    console.log('onMissingLog', log)
  }

  const ignoreLogs: BaseCrossCheckParam['ignoreLogs'] = [
    { transactionHash: '0x74f06e6f9a9b55a3ba0919ddac8e96757e51e4f6fba3eee3db35b93978531f42', index: 224 },
    { transactionHash: '0x9ba4172c0cb7846cdc6016c26b1e147c1ceb698c71ceb9ffe48b5710c9b1e922', index: 352 },
    { transactionHash: '0x18d20d133a3b3561677c8484ac22d59d9269af67d9b2c942922dbd0be9c70c54', index: 391 },
    { transactionHash: '0x3dbe4780a701ca7b4cbdded256fded89eedb734a4b3f0bab0b72f87195f8f1a4', index: 392 },
    { transactionHash: '0x864640ea4e370f2d3d24c0a2347036b6be76863664c83a3cc57c39e1de966824', index: 287 },
    { transactionHash: '0x1767432e8d128d2f4ea09709b68a810590edd3bda60e7dc86aae1d5fa26e5858', index: 283 },
    { transactionHash: '0x503541002ed626d22c32eac9cd0e00c5a61a1c71d3ed2a99c51a30c8dd6e27bc', index: 279 },
  ]

  const topics = [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  ]

  const cc = new BaseCrossChecker(provider)
  await cc.crossCheckRange({
    onMissingLog,
    ignoreLogs,
    fromBlock: 20003371,
    toBlock: 20003371,
    address: CONTRACT_ADDRESS,
    topics,
  })

  // choose catchup mode / realtime mode / catchup then realtime mode by fromBlock & toBlock
  const acc = new AutoCrossChecker(provider)
  await acc.start({
    onMissingLog,
    ignoreLogs,
    fromBlock: 20003371, // optional, empty to start from latest
    toBlock: 20003371, // optional, empty to enter continueous cc
    address: CONTRACT_ADDRESS,
    topics,
    batchBlocksCount: 1,
    intervalMsMin: 3000,
  })
}

describe('CrossChecker Tests', () => {
  it('should run crossCheckerTest without errors', async () => {
    const consoleSpy = vi.spyOn(console, 'log')

    await expect(crossCheckerTest()).resolves.not.toThrow()

    // Optionally, you can check if specific logs were called
    // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("onMissingLog"));

    consoleSpy.mockRestore()
  }, {
    timeout: 100000000,
  })
})
