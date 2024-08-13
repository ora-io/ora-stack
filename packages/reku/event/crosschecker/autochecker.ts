import type { ethers } from 'ethers'
import { polling, retryOnNull, sleep } from '@ora-io/utils'
import { ETH_BLOCK_INTERVAL } from '../../constants'
import type { Providers } from '../../types/w3'
import { CrossCheckerCacheManager } from './cache/manager'
import type { AutoCrossCheckParam, CrossCheckRangeParam } from './interface'
import { BaseCrossChecker } from './basechecker'

export class AutoCrossChecker extends BaseCrossChecker {
  // TODO: make cache self-clean with a MAX cap
  cache: CrossCheckerCacheManager
  checkpointBlockNumber = 0

  constructor(
    provider: Providers,
    options?: AutoCrossCheckParam,
  ) {
    super(provider)
    this.cache = new CrossCheckerCacheManager(options?.store, { storeKeyPrefix: options?.storeKeyPrefix })
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

  // TODO: keep type hint of inside AutoCrossCheckParam
  /**
   * real time auto crosscheck, start from the lastest block
   * @param options
   */
  async start(options: AutoCrossCheckParam) {
    this.validate(options)
    // TODO: use blockNumber for performance
    const latestblocknum = await retryOnNull(async () => await this.provider.provider?.getBlockNumber())
    const {
      fromBlock = latestblocknum + 1,
      batchBlocksCount = 10,
      pollingInterval = 1000,
      blockInterval = ETH_BLOCK_INTERVAL,
      delayBlockFromLatest = 1,
      toBlock, ignoreLogs,
    } = options

    // init checkpoint block num
    this.checkpointBlockNumber = fromBlock

    const ccrOptions: CrossCheckRangeParam = {
      ...options,
      // add to cache after callback success
      onMissingLog:
        async (log: ethers.Log) => {
          await options.onMissingLog(log)
          this.cache.addLogs([log])
        },
      fromBlock: -1, // placeholder
      toBlock: -1, // placeholder
    }

    if (ignoreLogs)
      await this.cache.addLogs(ignoreLogs)

    const updateCCROptions = async (ccrOptions: any) => {
      // iterate block range
      ccrOptions.fromBlock = this.checkpointBlockNumber
      // batchBlocksCount should > 0
      ccrOptions.toBlock = ccrOptions.fromBlock + batchBlocksCount - 1
      // return whole cache every time
      ccrOptions.ignoreLogs = await this.cache.getLogs()
    }

    const waitNextCrosscheck = async (): Promise<boolean> => {
      // TODO: use blockNumber for performance
      const latestblocknum = (await retryOnNull(async () => await this.provider.provider?.getBlock('latest'))).number
      this.logger.info('[*] ccrOptions: fromBlock', ccrOptions.fromBlock, ', toBlock', ccrOptions.toBlock, ', latestblocknum', latestblocknum)
      if (ccrOptions.toBlock + delayBlockFromLatest > latestblocknum) {
        // sleep until the toBlock
        this.logger.debug('sleep until the latestblocknum >= toBlock + delayBlockFromLatest, i.e.', (ccrOptions.toBlock + delayBlockFromLatest - latestblocknum) * blockInterval, 'ms')
        await sleep((ccrOptions.toBlock + delayBlockFromLatest - latestblocknum) * blockInterval)
        return false
      }
      return true
    }

    const waitOrUpdateToBlock = toBlock
      ? () => { ccrOptions.toBlock = Math.min(ccrOptions.toBlock, toBlock); return true }
      : waitNextCrosscheck

    const endingCondition = toBlock
      // ends on up to options.toBlock
      ? () => this.checkpointBlockNumber > toBlock
      // never ends if options.toBlock is not provided
      : () => false

    // TODO: replace polling with schedule cron
    await polling(async () => {
      await updateCCROptions(ccrOptions)

      if (await waitOrUpdateToBlock()) {
        await this.crossCheckRange(ccrOptions)
        // only set after cc succ
        this.checkpointBlockNumber = ccrOptions.toBlock + 1
      }

      return endingCondition()
    }, pollingInterval)
  }
}
