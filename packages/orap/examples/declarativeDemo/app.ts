import type { EventLog } from 'ethers'
import { Logger, randomStr, redisStore } from '@ora-io/utils'
import type { ListenOptions, ToKeyFn } from '../../src'
import { Orap, StoreManager } from '../../src'
import ABI from './erc20.abi.json'

const MAINNET_USDT_ADDR = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const TRANSFER_EVENT_NAME = 'Transfer'
const logger = new Logger('info', '[orap-mock-demo]')

export function startDemo(options: ListenOptions, storeConfig?: any) {
  // new orap
  const orap = new Orap()

  const store = redisStore(storeConfig)
  const sm = new StoreManager(store)

  const eventSignalParam = {
    address: MAINNET_USDT_ADDR,
    abi: ABI,
    eventName: TRANSFER_EVENT_NAME,
  }

  const toKey: ToKeyFn = (from: string, _to: string, _amount: number) => `${from}_${randomStr(4)}`

  orap.event(eventSignalParam)
    .crosscheck({
      store,
      storeKeyPrefix: 'ora-stack:orap:demo:cc:',
      storeTtl: 60000,
      pollingInterval: 3000,
      batchBlocksCount: 1,
      blockInterval: 12000,
      delayBlockFromLatest: 1,
    })
    // event hook, not necessary
    .handle(newEventSignalHook)
    // add a task
    .task()
    .cache(sm)
    .key(toKey)
    .prefix('ora-stack:orap:demo:TransferTask:', 'ora-stack:orap:demo:Done-TransferTask:')
    .ttl({ taskTtl: 120000, doneTtl: 60000 })
    .handle(handleTask)
    // add another task
    .another()
    .task()
    .prefix('ora-stack:orap:demo:AnotherTask:', 'ora-stack:orap:demo:Done-AnotherTask:')
    .cache(sm) // rm to use mem by default
    .ttl({ taskTtl: 20000, doneTtl: 20000 })
    .handle(handleTask_2)

  // start signal listener
  orap.listen(
    options,
    () => { logger.log('listening on provider.network') },
  )
}

async function handleTask(from: string, to: string, amount: number) {
  logger.log('[+] handleTask: from =', from, 'to =', to, 'amount =', amount)
  return true
}

async function newEventSignalHook(from: string, to: string, amount: number, event: EventLog) {
  logger.log('receive new event signal, tx:', event.transactionHash)
  logger.debug(' - from:', from, ' - to:', to, ' - amount:', amount)
  return true // true to continue handle tasks, false to hijack the process.
}

async function handleTask_2(from: string, to: string, amount: number) {
  logger.log('[+] handleTask_2: from =', from, 'to =', to, 'amount =', amount)
  return true
}
