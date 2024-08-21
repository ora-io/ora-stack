import { ethers } from 'ethers'
import { Logger, redisStore } from '@ora-io/utils'
import { Orap } from '../../orap'
import { StoreManager } from '../../src/store'
// import { Orap } from '@orap-io/orap'

// new orap
const orap = new Orap()

// use redis
const store = redisStore()
const sm = new StoreManager(store)

// use a logger
const logger = new Logger('info', '[orap-raplize-sample]')

const eventSignalParam = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  abi: { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event' },
  eventName: 'Transfer',
}

const handle = (...args: any) => { logger.log('handle', args); return true }

// define event signal with crosscheck, and customized cacheable tasks
// note: use redis as the cache layer
orap.event(eventSignalParam)
  .crosscheck({ pollingInterval: 1000, batchBlocksCount: 1, blockInterval: 12000 })
  // add a task
  .task()
  .cache(sm)
  .prefix('ora-stack:orap:raplizeSample:TransferTask:', 'ora-stack:orap:raplizeSample:Done-TransferTask:')
  .ttl({ taskTtl: 120000, doneTtl: 60000 })
  .handle(handle)

// set logger before listen
orap.logger(logger)

// start signal listeners
orap.listen(
  {
    wsProvider: new ethers.WebSocketProvider('wss://127.0.0.1'),
    httpProvider: new ethers.JsonRpcProvider('http://127.0.0.1'),
  },
  () => { logger.log('listening on provider.network') },
)
