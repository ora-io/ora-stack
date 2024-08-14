import type { Logger, Milliseconds, Store } from '@ora-io/utils'
import { SimpleStoreManager, logger } from '@ora-io/utils'
import type { SimpleLog } from '../interface'

export interface CacheManagerOptions {
  noLogIndex?: boolean
  keyPrefix?: string
  ttl?: Milliseconds
  logger?: Logger
}

/**
 * Basic cache for cross checker
 */
export class CrossCheckerCacheManager extends SimpleStoreManager {
  noLogIndex: boolean // TODO: this is used no where for now, add when needed
  storeKeyPrefix: string
  ttl?: Milliseconds
  logger: Logger

  constructor(store?: Store, options?: CacheManagerOptions) {
    super(store)
    this.noLogIndex = options?.noLogIndex ?? false
    this.storeKeyPrefix = options?.keyPrefix ?? ''
    this.ttl = options?.ttl
    this.logger = options?.logger ?? logger
  }

  /**
   * add log into store record that can indicate a log
   * @param log
   */
  async addLog(log: SimpleLog) {
    this.logger.debug('cache manager - addLog:', log.transactionHash, log.index)
    const key = this.encodeLogKey(log)
    await this.set(key, true, this.ttl)
  }

  /**
   * add logs into store records
   * @param logs
   * @returns CrossCheckerCache
   */
  async addLogs(logs: SimpleLog[]) {
    for (const log of logs) {
      // await this.addLog.call(this, log)
      await this.addLog(log)
    }
  }

  /**
   * get all known logs from store
   * @returns
   */
  async getLogs(): Promise<SimpleLog[]> {
    const keys = await this.keys(this.storeKeyPrefix)
    this.logger.debug('cachemanager-getLogs:', keys)
    const logs: SimpleLog[] = []
    for (const key of keys)
      logs.push(this.decodeLogKey(key))

    return logs
  }

  /**
   * @dev can add this.style: string = 'redis' when supporting other store type
   * @param log
   * @returns
   */
  encodeLogKey(log: SimpleLog): string {
    const key = log.index && !this.noLogIndex ? `${this.storeKeyPrefix + log.transactionHash}:${log.index}` : this.storeKeyPrefix + log.transactionHash
    logger.debug('cc-cm-encodeKey', key)
    return key
  }

  decodeLogKey(key: string): SimpleLog {
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
   * ttl: should be consist with log records, otherwise will do redundant work
   * @param checkpoint
   */
  async setCheckpoint(checkpoint: number) {
    await this.set(`${this.storeKeyPrefix}checkpoint`, checkpoint, this.ttl)
  }

  async getCheckpoint(): Promise<number | undefined> {
    return await this.get(`${this.storeKeyPrefix}checkpoint`)
  }
}
