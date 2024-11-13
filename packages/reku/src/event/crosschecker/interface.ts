import type { Awaitable, ContractAddress, Milliseconds, Store } from '@ora-io/utils'
import type { ethers } from 'ethers'

export type FnOnMissingLog = (log: ethers.Log) => Awaitable<void>

export interface SimpleLog { transactionHash: string; index?: number }

export interface LogFilterParam {
  address: ContractAddress
  topics: string[]
  fromBlock?: number
  toBlock?: number
}

export interface BaseCrossCheckParam extends LogFilterParam {
  onMissingLog: FnOnMissingLog
  ignoreLogs?: SimpleLog[]
}

export interface CrossCheckFromParam extends BaseCrossCheckParam {
  fromBlock: number
}

export interface CrossCheckRangeParam extends CrossCheckFromParam {
  toBlock: number
}

export interface CrossCheckRetroParam extends BaseCrossCheckParam {
  retroBlockCount: number
}

// TODO: use rpc to calc blockInterval
export interface AutoCrossCheckParam extends BaseCrossCheckParam {
  store?: Store
  storeKeyPrefix?: string // set the prefix to all keys when set key-value to store (cache), e.g. key = prefix+txHashList
  storeTtl?: Milliseconds // the ttl for <txhash, log index> record in store
  batchBlocksCount?: number // how many blocks at most to get per check
  delayBlockFromLatest?: number // mostly for realtime mode; each time cc wait until latest height > toBlock + delayBlockFromLatest
  blockInterval?: Milliseconds // the block interval of the given chain, default: eth
  pollingInterval?: Milliseconds // mostly for limiting getLogs calling rate in catchup mode; how long does it take at least between 2 checks
}
