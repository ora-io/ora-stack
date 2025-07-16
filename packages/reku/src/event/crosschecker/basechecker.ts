import type { ethers } from 'ethers'
import type { ContractAddress } from '@ora-io/utils'
import { timeoutWithRetry, to } from '@ora-io/utils'
import { ETH_BLOCK_COUNT_ONE_HOUR } from '../../constants'
import type { Providers } from '../../types/w3'
import { debug } from '../../debug'
import type { CrossCheckFromParam, CrossCheckRangeParam, CrossCheckRetroParam, SimpleLog } from './interface'

export class BaseCrossChecker {
  provider: Providers
  constructor(provider: Providers) {
    this.provider = provider
  }

  /**
   * check range: [fromBlock, toBlock]
   * @param options
   */
  async crossCheckRange(options: CrossCheckRangeParam) {
    await this._crossCheck(options)
  }

  // TODO: maybe useless considering crossCheckFrom?
  /**
   * check range: [lastest-retroBlockCount, lastest]
   * @param ccrOptions
   */
  async crossCheckRetro(
    ccrOptions: CrossCheckRetroParam,
  ) {
    // suggest use large retroBlockCount
    const { retroBlockCount } = ccrOptions
    // TODO: change to chain rpc based block interval
    if (retroBlockCount < ETH_BLOCK_COUNT_ONE_HOUR)
      console.warn('crosscheck retroBlockCount too low, recommend block range >= 1 hour')

    // define from, to
    // TODO: use blockNumber for performance
    const [err, block] = await to(timeoutWithRetry(() => {
      if (!this.provider || !this.provider.provider)
        throw new Error('provider not ready')
      return this.provider.provider.getBlock('latest')
    }, 15 * 1000, 3))
    if (err) {
      console.warn('crosscheck failed to get latest block', err)
      return
    }
    if (!block) {
      console.warn('crosscheck failed to get latest block')
      return
    }
    const options: CrossCheckRangeParam = {
      ...ccrOptions,
      fromBlock: block.number - retroBlockCount,
      toBlock: block.number,
    }

    this._crossCheck(options)
  }

  /**
   * check range: [fromBlock (only recent), lastest]
   * @param ccfOptions
   * @returns
   */
  async crossCheckFrom(
    ccfOptions: CrossCheckFromParam,
  ) {
    // TODO: use blockNumber for performance
    const [err, block] = await to(timeoutWithRetry(() => {
      if (!this.provider || !this.provider.provider)
        throw new Error('provider not ready')
      return this.provider.provider.getBlock('latest')
    }, 15 * 1000, 3))
    if (err) {
      console.warn('crosscheck failed to get latest block', err)
      return
    }
    if (!block) {
      console.warn('crosscheck failed to get latest block')
      return
    }
    // suggest use large retroBlockCount
    if (block.number - ccfOptions.fromBlock < ETH_BLOCK_COUNT_ONE_HOUR)
      console.warn('crosscheck retroBlockCount too low, recommend crosscheck interval >= 1 hour')

    // define from, to
    const options: CrossCheckRangeParam = {
      ...ccfOptions,
      fromBlock: ccfOptions.fromBlock,
      toBlock: block.number,
    }

    this._crossCheck(options)
    return block.number
  }

  async diff(logs: ethers.Log[], ignoreLogs: SimpleLog[]): Promise<ethers.Log[]> {
    const missing = (logToFind: ethers.Log) => {
      const logIndex = ignoreLogs.findIndex(
        log => log.transactionHash === logToFind.transactionHash
          && (!log.index || log.index === logToFind.index),
      )

      return logIndex === -1
    }
    // filter missing logs
    const missingLogs = logs.filter((log) => { return missing(log) })//
    return missingLogs
  }

  async _crossCheck(options: CrossCheckRangeParam) {
    // get period logs
    const { fromBlock, toBlock, address, topics } = options
    debug('start crosscheck from %d to %d', fromBlock, toBlock)

    if (this.provider.provider) {
      const addresses: ContractAddress[][] = []
      if (Array.isArray(address)) {
        if (options.addressGroupLimit) {
          for (let i = 0; i < address.length; i += options.addressGroupLimit)
            addresses.push(address.slice(i, i + options.addressGroupLimit))
        }
        else {
          addresses.push(address)
        }
      }
      else {
        addresses.push([address])
      }

      const requests = addresses.map((address) => {
        const params = {
          fromBlock,
          toBlock,
          ...(address && { address }),
          ...(topics && { topics }),
        }

        const fn = async () => {
          if (!this.provider || !this.provider.provider)
            throw new Error('provider not ready')
          return this.provider?.provider?.getLogs(params)
        }
        if (options.retryOptions)
          return timeoutWithRetry(fn, options.retryOptions.timeout || 15 * 1000, options.retryOptions.retries || 3)

        else
          return fn()
      })

      const logs = (await Promise.all(requests)).reduce((acc, curr) => {
        return acc.concat(curr)
      }, [])

      // get ignoreLogs keys
      const ignoreLogs = options.ignoreLogs

      // crosscheck missing logs
      const missingLogs = ignoreLogs ? await this.diff(logs, ignoreLogs) : logs

      // callback on missing logs
      for (const log of missingLogs) {
        debug('missing tx hash: %s', log.transactionHash)
        await options.onMissingLog(log)
      }
    }
  }
}

