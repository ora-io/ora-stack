import type { EventLog } from 'ethers'
import { randomStr, redisStore } from '@ora-io/utils'
import type { Context, ListenOptions } from '../../index'
import { Orap, StoreManager } from '../../index'
import { config, logger } from './config'
import ABI from './erc20.abi.json'

// new orap
const orap = new Orap()

let store: any
let sm: any

export function startDemo(options: ListenOptions, storeConfig?: any) {
  logger.log('declarative demo start...')
  store = redisStore(storeConfig) // use redis
  // store = memoryStore(storeConfig); // use memory
  sm = new StoreManager(store)

  const eventSignalParam = {
    address: config.MAINNET_USDT_ADDR,
    abi: ABI,
    eventName: config.TRANSFER_EVENT_NAME,
  }

  const context = { chain: 'testchain' }

  const taskprefixFn = (_context?: Context) => { return 'ora-stack:orap:demo:TransferTask:' }
  const doneprefixFn = (_context?: Context) => { return 'ora-stack:orap:demo:Done-TransferTask:' }

  orap.event(eventSignalParam, newSignalHook)
    .crosscheck({
      store,
      storeKeyPrefix: 'ora-stack:orap:demo:cc:',
      storeTtl: config.CROSSCHECKER_CACHE_TTL,
      pollingInterval: 3000,
      batchBlocksCount: 1,
      blockInterval: 12000,
      delayBlockFromLatest: 1,
    })
    .task(sm, context)
    .key(log => randomStr(4) + log.from) // TODO: log receives [] rather than {}
    .prefix(taskprefixFn, doneprefixFn)
    .ttl({ taskTtl: 120, doneTtl: 60 })
    .handle(taskHandler)

  // set logger before listen
  orap.logger(logger)

  // start signal listener
  orap.listen(
    options,
    () => { logger.log('listening on provider.network') },
  )
}

// TODO: TaskClassForVerse?
async function taskHandler(task: Record<string, any>, _context?: Context) {
  logger.log('[+] handleTask', task.toString())
  return true
}

async function newSignalHook(from: any, to: any, amount: any, event: EventLog) {
  logger.log('new signal', event.transactionHash)
  return true // true to continue, false to hijack the process.
}
