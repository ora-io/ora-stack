import type { EventLog } from 'ethers'
import { redisStore } from '@ora-io/utils'
import type { ListenOptions } from '../../index'
import { Orap, StoreManager } from '../../index'
import { config, logger } from './config'
import ABI from './erc20.abi.json'
import { TransferTask } from './taskTransfer'

// new orap
const orap = new Orap()
// set to app specific logger
orap.setLogger(logger)

let store: any
let sm: any

export function startDemo(options: ListenOptions, storeConfig?: any) {
  store = redisStore(storeConfig) // use redis
  // store = memoryStore(storeConfig); // use memory
  sm = new StoreManager(store)

  const eventSignalParam = {
    address: config.MAINNET_USDT_ADDR,
    abi: ABI,
    eventName: config.TRANSFER_EVENT_NAME,
  }

  orap.event(eventSignalParam, handleSignal)
    .crosscheck({
      store,
      storeKeyPrefix: 'ora-stack:orap:demo:cc:',
      pollingInterval: 3000,
      batchBlocksCount: 1,
      blockInterval: 12000,
      delayBlockFromLatest: 1,
    })

  // start processors
  startProcessor()
  // start signal listener
  orap.listen(
    options,
    () => { logger.log('listening on provider.network') },
  )
}

async function handleSignal(from: any, to: any, amount: any, event: EventLog) {
  logger.log('handleSignal', event.transactionHash)
  const task = new TransferTask(event.transactionHash, from, to, amount)
  await task.save(sm)
}

// TODO: make the following DBApp?
async function startProcessor() {
  while (true) {
    const task = await TransferTask.load(sm)
    await task.handle()
    // await task.remove(sm) // delete task from store when finished
    await task.done(sm) // save task in store when finished
  }
}
