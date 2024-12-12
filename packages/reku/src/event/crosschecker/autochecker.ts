import type { ethers } from 'ethers'
import { polling, timeoutWithRetry } from '@ora-io/utils'
import { ETH_BLOCK_INTERVAL } from '../../constants'
import type { Providers } from '../../types/w3'
import { debug } from '../../debug'
import { CrossCheckerCacheManager } from './cache/manager'
import type { AutoCrossCheckParam, CrossCheckRangeParam, SimpleLog } from './interface'
import { BaseCrossChecker } from './basechecker'

export class AutoCrossChecker extends BaseCrossChecker {
  cache: CrossCheckerCacheManager | undefined = undefined
  checkpointBlockNumber: number | undefined

  constructor(
    provider: Providers,
  ) {
    super(provider)
  }

  validate(options: AutoCrossCheckParam) {
    const { batchBlocksCount, toBlock, fromBlock, pollingInterval, blockInterval } = options
    const defaultBlockInterval = ETH_BLOCK_INTERVAL

    if (batchBlocksCount !== undefined) {
      if (batchBlocksCount <= 0)
        throw new Error('options invalid: should batchBlocksCount >= 1')
    }

    if (toBlock !== undefined) {
      if (fromBlock === undefined)
        throw new Error('options invalid: need fromBlock when toBlock presents')

      if (toBlock < fromBlock)
        throw new Error('options invalid: should fromBlock <= toBlock')
    }
    else { // only throw in realtime mode
      if (pollingInterval !== undefined && batchBlocksCount !== undefined) {
        const intervalLimit = batchBlocksCount * (blockInterval ?? defaultBlockInterval)
        if (pollingInterval > intervalLimit)
          throw new Error('options invalid: should pollingInterval <= batchBlocksCount * blockInterval when no toBlock present, otherwise crosscheck will never catch up with the latest')
      }
    }
  }

  async setCheckpoint(cp: number) {
    this.checkpointBlockNumber = cp
    await this.cache!.setCheckpoint(cp)
  }

  // TODO: keep type hint of inside AutoCrossCheckParam
  /**
   * real time auto crosscheck, start from the lastest block
   * @param options
   */
  async start(options: AutoCrossCheckParam) {
    debug('auto crosscheck start with options: %O', options)
    this.validate(options)

    this.cache = new CrossCheckerCacheManager(options?.store, { keyPrefix: options?.storeKeyPrefix, ttl: options?.storeTtl })

    let latestBlockNum = await timeoutWithRetry(() => this.provider.provider?.getBlockNumber(), 15 * 1000, 3)

    // resume checkpoint priority: options.fromBlock > cache > latestBlockNum + 1
    const defaultInitCheckpoint = await this.cache.getCheckpoint() ?? (latestBlockNum)

    const {
      fromBlock = defaultInitCheckpoint,
      batchBlocksCount = 10,
      pollingInterval = 3000,
      // blockInterval = ETH_BLOCK_INTERVAL,
      delayBlockFromLatest = 1,
      toBlock,
    } = options

    await this.setCheckpoint(fromBlock)

    const ccrOptions: CrossCheckRangeParam = {
      ...options,
      // add to cache after callback success
      onMissingLog:
        async (log: ethers.Log) => {
          await options.onMissingLog(log)
          this.cache!.addLogs([log])
        },
      fromBlock,
      toBlock: fromBlock + batchBlocksCount - 1,
    }

    const waitNextCrosscheck = async (): Promise<boolean> => {
      latestBlockNum = await timeoutWithRetry(() => this.provider.provider?.getBlockNumber(), 15 * 1000, 3)
      if (ccrOptions.toBlock + delayBlockFromLatest > latestBlockNum) {
        // sleep until the toBlock
        // await sleep((ccrOptions.toBlock + delayBlockFromLatest - latestBlockNum) * blockInterval)
        return false
      }
      return true
    }

    const waitOrUpdateToBlock = toBlock
      ? () => {
          ccrOptions.toBlock = Math.min(ccrOptions.toBlock, toBlock)
          return true
        }
      : waitNextCrosscheck

    const updateCCROptions = async (ccrOptions: CrossCheckRangeParam) => {
      // only set after cc succ
      await this.setCheckpoint(ccrOptions.toBlock + 1)
      // iterate block range
      ccrOptions.fromBlock = this.checkpointBlockNumber!
      // batchBlocksCount should > 0
      ccrOptions.toBlock = ccrOptions.fromBlock + batchBlocksCount - 1
    }

    const endingCondition = toBlock
      // ends on up to options.toBlock
      ? () => this.checkpointBlockNumber! > toBlock
      // never ends if options.toBlock is not provided
      : () => false

    debug('crosscheck running')

    // TODO: replace polling with schedule cron
    await polling(async () => {
      const wait = await waitOrUpdateToBlock()
      debug('polling interval: %d, wait: %s, from block: %d, to block: %d', pollingInterval, wait, ccrOptions.fromBlock, ccrOptions.toBlock)
      if (wait) {
        await this.crossCheckRange(ccrOptions)
        // only update options after cc succ
        await updateCCROptions(ccrOptions)
      }
      else {
        debug('Because the latest block %d is too old, skip this cross check', latestBlockNum)
      }
      return endingCondition()
    }, pollingInterval)
  }

  async diff(logs: ethers.Log[], ignoreLogs: SimpleLog[]): Promise<ethers.Log[]> {
    const newlogs = await super.diff(logs, ignoreLogs)
    const res: ethers.Log[] = []
    for (const log of newlogs) {
      const key = this.cache!.encodeLogKey(log)
      const logExist = await this.cache!.has(key)
      if (!logExist)
        res.push(log)
    }
    return res
  }
}
