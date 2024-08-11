<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/dev/assets/orap.logo.png?raw=true" alt="Orap Icon" width="200"/></div>

# ORAP: Oracle Application Framework

ORAP is an out of box, express style framework.

## Usage
```ts
import { ListenOptions, Orap, StoreManager } from '../../orap'
import { memoryStore, redisStore } from '../../utils'

const orap = new Orap()
// const sm = new StoreManager(redisStore(...)) // use redis
const sm = new StoreManager() // use memory

const eventSignalParam = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  abi: { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event' },
  eventName: 'Transfer',
}

const handle = (...args: any) => { console.log('handle', args) }

orap.event(eventSignalParam, handle)
  .crosscheck({ intervalMsMin: 1000, batchBlocksCount: 1, blockIntervalMs: 12000 })

orap.listen(
  { wsProvider: 'wss://127.0.0.1', httpProvider: 'http://127.0.0.1' },
  () => { console.log('listening on provider.network') }
)
```

### listen options
- required: wsProvider, for subscription
- optional: httpProvider, for crosscheck only, since crosscheck is based on getLogs

## Task

### TaskBase
- provide universal `toString`, `fromString`, `stringify` 

### TaskStorable
- provide store (redis) compatible features, i.e. load, save, remove, done
- overwrite when extends:
  - `toKey()` (required): define the primary key that identifies each task, **doesn't** include `taskPrefix`
  - `taskPrefix` (recommend): set the prefix of all tasks, also is used when `load` task
  - `taskPrefixDone` (recommend): set the prefix of finished tasks, only used in `done`; no need to set if you don't use "task.done(sm)"

## Signal

all actions that arrive the oracle server and trigger actions are defined as signal, including:
- [x] event
- [ ] block
- [ ] http request
etc.

### EventSignal
- define event listener as simple as: `orap.event({address:"0x", abi:"", eventName: "Transfer"}, handleSignal)`
- provide crosschecker by `reku`, available config please checkout `AutoCrossCheckParam` in `reku`
- currently one and only one crosschecker is set to each event signal
- store: provide 2 options: use memory or redis, checkout `orap/store`
