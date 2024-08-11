import type { Store } from '@ora-io/utils'
import { SimpleStoreManager } from '@ora-io/utils'
import type { SimpleLog } from '../interface'

/**
 * Basic cache for cross checker
 */
export class CrossCheckerCacheManager extends SimpleStoreManager {
  noLogIndex: boolean

  addLog: any

  constructor(store?: Store, options?: { noLogIndex?: boolean }) {
    super(store)
    this.noLogIndex = options?.noLogIndex ?? false
    this.addLog = this.noLogIndex ? this.addLogWithoutLogIndex : this.addLogWithLogIndex
  }

  async validateFormat() {
    const txHashList = await this.getTxHashList() || []
    const logIndexList = await this.getLogIndexList() || []

    if (!this.noLogIndex && txHashList.length !== logIndexList.length)
      throw new Error('cache store: txHashList.length != logIndexList.length')
  }

  // TODO: is this in high efficiency?
  async addLogWithLogIndex(log: SimpleLog) {
    // console.log('log', log)
    if (log.index == null || log.index === undefined)
      throw new Error('addLogWithLogIndex: lack of log.index')

    const txHashList = await this.getTxHashList() || []
    const logIndexList = await this.getLogIndexList() || []

    const txFindIdx = txHashList.indexOf(log.transactionHash)

    if (txFindIdx === -1) {
      // If the transaction hash is not in the list, add it and initialize a new log index list
      txHashList.push(log.transactionHash)
      logIndexList.push([log.index])
    }
    else {
      // If the transaction hash is already in the list, check if the log.index is in the list
      const logIndexFindIdx = logIndexList[txFindIdx].indexOf(log.index)
      if (logIndexFindIdx === -1) {
        // If the log.index is not in the list, add it to the corresponding log index list
        logIndexList[txFindIdx].push(log.index)
      }
    }
    await this.setTxHashList(txHashList)
    await this.setLogIndexList(logIndexList)
  }

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
    this.validateFormat()

    const txHashList = await this.getTxHashList() || []
    const logIndexList = await this.getLogIndexList() || []

    const logs: SimpleLog[] = []
    for (let i = 0; i < txHashList.length; i++) {
      if (this.noLogIndex) {
        logs.push({ transactionHash: txHashList[i] })
      }
      else {
        for (let j = 0; j < logIndexList[i].length; j++)
          logs.push({ transactionHash: txHashList[i], index: logIndexList[i][j] })
      }
    }
    return logs
  }

  // TODO: is this <txHashList, logIndexList> the most efficient internal storage format?
  async getTxHashList() {
    return await this.get<string[]>('txHashList')
  }

  async getLogIndexList() {
    return await this.get<number[][]>('logIndexList')
  }

  async setTxHashList(txHashList: string[]) {
    await this.set('txHashList', txHashList)
  }

  async setLogIndexList(logIndexList: number[][]) {
    await this.set('logIndexList', logIndexList)
  }
}
