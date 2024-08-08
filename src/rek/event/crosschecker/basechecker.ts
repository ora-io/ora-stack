/* eslint-disable no-unused-vars */
import { ethers } from 'ethers';
import { retryOnNull } from '../../../utils/common/retry';
import { ETH_BLOCK_COUNT_ONE_HOUR } from '../../constants';
import { CrossCheckRetroParam, CrossCheckFromParam, CrossCheckRangeParam, SimpleLog } from './interface';
import { logger } from '../../../utils';

export class BaseCrossChecker {
  provider: ethers.Provider
  constructor(provider: ethers.Provider) {
    this.provider = provider
  }

  /**
   * check range: [fromBlock, toBlock]
   * @param options 
   */
  async crossCheckRange(options: CrossCheckRangeParam) {
    await this._crossCheck(options);
  }

  //TODO: maybe useless considering crossCheckFrom?
  /**
   * check range: [lastest-retroBlockCount, lastest]
   * @param ccrOptions 
   */
  async crossCheckRetro(
    ccrOptions: CrossCheckRetroParam,
  ) {
    // suggest use large retroBlockCount
    const { retroBlockCount } = ccrOptions;
    // TODO: change to chain rpc based block interval
    if (retroBlockCount < ETH_BLOCK_COUNT_ONE_HOUR)
      logger.warn("crosscheck retroBlockCount too low, recommend block range >= 1 hour")

    // define from, to
    //TODO: use blockNumber for performance
    const block = await retryOnNull(async () => await this.provider.getBlock('latest'));
    const options: CrossCheckRangeParam = {
      ...ccrOptions,
      fromBlock: block.number - retroBlockCount,
      toBlock: block.number
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
    //TODO: use blockNumber for performance
    const block = await retryOnNull(async () => await this.provider.getBlock('latest'));

    // suggest use large retroBlockCount
    if (block.number - ccfOptions.fromBlock < ETH_BLOCK_COUNT_ONE_HOUR)
      logger.warn("crosscheck retroBlockCount too low, recommend crosscheck interval >= 1 hour")

    // define from, to
    const options: CrossCheckRangeParam = {
      ...ccfOptions,
      fromBlock: ccfOptions.fromBlock,
      toBlock: block.number
    }

    this._crossCheck(options)
    return block.number
  }

  async diff_old(logs: ethers.Log[], txHashList: string[], logIndexList: number[][]): Promise<ethers.Log[]> {
    const missing = (log: ethers.Log) => {
      const txIndex = txHashList?.indexOf(log.transactionHash) || -1;
      // 1. tx missing, or 2. if passed in logIndexList, event idx missing
      return txIndex === -1 || (logIndexList && !logIndexList[txIndex].includes(log.index));
    }
    // filter missing logs
    const missingLogs = logs.filter(log => { return missing(log) });//
    return missingLogs;
  }

  async diff(logs: ethers.Log[], ignoreLogs: SimpleLog[]): Promise<ethers.Log[]> {
    const missing = (logToFind: ethers.Log) => {
      const logIndex = ignoreLogs.findIndex(
        log => log.transactionHash === logToFind.transactionHash 
        && ( !log.index || log.index === logToFind.index)
      );

      return logIndex === -1;
    }
    // filter missing logs
    const missingLogs = logs.filter(log => { return missing(log) });//
    return missingLogs;
  }

  async _crossCheck(options: CrossCheckRangeParam) {
    // get period logs
    const { fromBlock, toBlock, address, topics } = options
    const params = {
      fromBlock: fromBlock,
      toBlock: toBlock,
      ...(address && { address }),
      ...(topics && { topics }),
    }
    const logs = await this.provider.getLogs(params);
    // get ignoreLogs keys
    const ignoreLogs = options.ignoreLogs
    
    // crosscheck missing logs
    const missingLogs = ignoreLogs ? await this.diff(logs, ignoreLogs) : logs

    // callback on missing logs
    for (const log of missingLogs) {
      await options.onMissingLog(log);
    }
  }
}

