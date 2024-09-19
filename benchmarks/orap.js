/* eslint-disable no-console */
const process = require('node:process')
const { Orap, StoreManager, TaskStorable } = require('@ora-io/orap')
const { RekuProviderManager } = require('@ora-io/reku')
const { memoryStore } = require('@ora-io/utils')
const ERC20_ABI = require('./erc20.abi.json')
const { startUsageSchedule } = require('./consumption.js')

const MAINNET_USDT_ADDR = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const TRANSFER_EVENT_NAME = 'Transfer'

const orap = new Orap()

const store = memoryStore()
const sm = new StoreManager(store)

class TransferTask extends TaskStorable {
  static taskPrefix = 'ora-stack:orap:demo:TransferTask:'
  static taskPrefixDone = 'ora-stack:orap:demo:Done-TransferTask:'

  constructor(
    id,
    from,
    to,
    amount,
  ) {
    super()
    this.id = id
    this.from = from
    this.to = to
    this.amount = amount
  }

  toKey() {
    if (!this.id)
      throw new Error('uninitialized')
    return this.id.toString()
  }

  async handle() {
    // TODO
  }

  /** ***************** overwrite samples **************/

  async save(sm) {
    await super.save(sm)
  }

  static async load(sm) {
    const task = await super._load(sm)
    return task
  }

  async done(sm) {
    await super.done(sm)
  }

  async remove(sm) {
    await super.remove(sm)
  }
}

async function startProcessor() {
  while (true) {
    const task = await TransferTask.load(sm)
    await task.handle()
    // await task.remove(sm) // delete task from store when finished
    await task.done(sm) // save task in store when finished
    await task.remove(sm) // delete task from store when finished
  }
}

async function handleSignal(from, to, amount, event) {
  const task = new TransferTask(event.log.transactionHash, from, to, amount)
  await task.save(sm)
  return true
}

const mode = process.argv[3]
if (!mode) {
  console.error('Please provide a mode')
  process.exit()
}

function start() {
  // new orap

  const eventSignalParam = {
    address: MAINNET_USDT_ADDR,
    abi: ERC20_ABI,
    eventName: TRANSFER_EVENT_NAME,
  }

  const event = orap.event(eventSignalParam)
    .crosscheck({
      store,
      storeKeyPrefix: 'ora-stack:orap:demo:cc:',
      storeTtl: 60000,
      pollingInterval: 3000,
      batchBlocksCount: 1,
      blockInterval: 12000,
      delayBlockFromLatest: 1,
    })
  if (mode === 'raplized') {
    // add a task
    event.task()
      .cache(sm)
      .handle(() => {
        return true
      })
  }
  else {
    event.handle(handleSignal)
    startProcessor()
  }

  // start signal listener
  orap.listen(
    {
      wsProvider: new RekuProviderManager('wss://ethereum-rpc.publicnode.com'),
      httpProvider: new RekuProviderManager('https://rpc.ankr.com/eth'),
    },
    () => {
      console.log('listening on mode:', mode)
      startUsageSchedule(mode)
    },
  )
}

start()
