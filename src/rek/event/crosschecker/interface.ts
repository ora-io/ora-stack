/* eslint-disable no-unused-vars */
import { Awaitable } from '@murongg/utils';
import { ethers } from 'ethers';
import { Store } from 'cache-manager';

export type FnOnMissingLog = (log: ethers.Log) => Awaitable<void>

export type SimpleLog = { transactionHash: string, index?: number }

export interface LogFilterParam {
  address: string,
  topics: string[],
  fromBlock?: number,
  toBlock?: number,
}

export interface BaseCrossCheckParam extends LogFilterParam {
  onMissingLog: FnOnMissingLog
  ignoreLogs?: SimpleLog[]
}

export interface CrossCheckFromParam extends BaseCrossCheckParam {
  fromBlock: number,
}

export interface CrossCheckRangeParam extends CrossCheckFromParam {
  toBlock: number,
}

export interface CrossCheckRetroParam extends BaseCrossCheckParam {
  retroBlockCount: number
}

// TODO: use rpc to calc blockIntervalMs
export interface AutoCrossCheckParam extends BaseCrossCheckParam {
  store?: Store
  batchBlocksCount?: number // how many blocks at most to get per check
  intervalMsMin?: number // mostly for limiting getLogs calling rate in catchup mode; how long does it take at least between 2 checks
  blockIntervalMs?: number // the block interval of the given chain, default: eth
  delayBlockFromLatest?: number // mostly for realtime mode; each time cc wait until latest height > toBlock + delayBlockFromLatest
}
