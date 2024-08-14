import type { Logger, Store } from '@ora-io/utils'
import { SimpleStoreManager, logger } from '@ora-io/utils'
import type { SimpleLog } from '../interface'

/**
 * Basic cache for cross checker
 */
export class CrossCheckerCacheManager extends SimpleStoreManager {
  noLogIndex: boolean // TODO: this is used no where for now, add when needed
  storeKeyPrefix: string
  logger: Logger

  constructor(store?: Store, options?: { noLogIndex?: boolean; storeKeyPrefix?: string; logger?: Logger }) {
    super(store)
    this.noLogIndex = options?.noLogIndex ?? false
    this.storeKeyPrefix = options?.storeKeyPrefix ?? ''
    this.logger = options?.logger ?? logger
    // this.addLog = this.noLogIndex ? this.addLogWithoutLogIndex : this.addLogWithLogIndex
  }

  /**
   * @deprecated
   */
  async validateFormat() {
    const txHashList = await this.getTxHashList() || []
    const logIndexList = await this.getLogIndexList() || []

    if (!this.noLogIndex && txHashList.length !== logIndexList.length)
      throw new Error('cache store: txHashList.length != logIndexList.length')
  }

  // TODO: is this in high efficiency?
  async addLog(log: SimpleLog) {
    this.logger.debug('cache manager - addLog:', log.transactionHash, log.index)
    const key = this.encodeKey(log)
    await this.set(key, true)
  }

  /**
   * @dev can add this.style: string = 'redis' when supporting other store type
   * @param log
   * @returns
   */
  encodeKey(log: SimpleLog): string {
    const key = log.index && !this.noLogIndex ? `${this.storeKeyPrefix + log.transactionHash}:${log.index}` : this.storeKeyPrefix + log.transactionHash
    logger.debug('cc-cm-encodeKey', key)
    return key
  }

  decodeKey(key: string): SimpleLog {
    logger.debug('cc-cm-decodeKey', key)
    if (!key.startsWith(this.storeKeyPrefix))
      throw new Error(`The prefix ${this.storeKeyPrefix} is not a prefix of ${key}`)

    const _noprefix_key = key.slice(this.storeKeyPrefix.length)

    const parts = _noprefix_key.split(':')
    if (parts.length > 2)
      throw new Error(`wrong key format when decoding, expecting ${this.storeKeyPrefix}+xx:xx, getting ${key}`)

    const log = { transactionHash: parts[0], index: parts.length === 2 ? parseInt(parts[1]) : undefined }
    return log
  }

  /**
   * @deprecated
   * @param log
   */
  async addLogWithoutLogIndex(log: SimpleLog) {
    const txHashList = await this.getTxHashList() || []
    if (!txHashList?.includes(log.transactionHash))
      txHashList && txHashList.push(log.transactionHash)
    await this.setTxHashList(txHashList)
  }

  /**
   * parse logs into log ids that can indicate a log
   * @param logs
   * @returns CrossCheckerCache
   */
  async addLogs(logs: SimpleLog[]) {
    for (const log of logs) {
      // await this.addLog.call(this, log)
      await this.addLog(log)
    }
  }

  async getLogs(): Promise<SimpleLog[]> {
    // this.validateFormat()

    // const txHashList = await this.getTxHashList() || []
    // const logIndexList = await this.getLogIndexList() || []
    const keys = await this.keys(this.storeKeyPrefix)
    this.logger.debug('cachemanager-getLogs:', keys)
    const logs: SimpleLog[] = []
    for (const key of keys) {
      // const [storeKeyPrefix, txHash, index] = key.split(':')
      // if (storeKeyPrefix !== this.storeKeyPrefix)
      //   continue
      // logs.push({ transactionHash: txHash, index: index ? Number(index) : undefined })
      logs.push(this.decodeKey(key))
    }
    return logs
  }

  // TODO: is this <txHashList, logIndexList> the most efficient internal storage format?
  /**
   * @deprecated
   */
  async getTxHashList() {
    return await this.get<string[]>(`${this.storeKeyPrefix}txHashList`)
  }

  /**
   * @deprecated
   * @returns
   */
  async getLogIndexList() {
    return await this.get<number[][]>(`${this.storeKeyPrefix}logIndexList`)
  }

  /**
   * @deprecated
   * @param txHashList
   */
  async setTxHashList(txHashList: string[]) {
    await this.set(`${this.storeKeyPrefix}txHashList`, txHashList)
  }

  /**
   * @deprecated
   * @param logIndexList
   */
  async setLogIndexList(logIndexList: number[][]) {
    await this.set(`${this.storeKeyPrefix}logIndexList`, logIndexList)
  }
}
