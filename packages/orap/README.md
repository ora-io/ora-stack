<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/main/assets/orap.logo.png?raw=true" alt="Orap Icon" width="200"/></div>

# ORAP: Oracle Application Framework

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@ora-io/orap?style=flat&colorA=080f12&colorB=6e70d4
[npm-version-href]: https://npmjs.com/package/@ora-io/orap
[npm-downloads-src]: https://img.shields.io/npm/dm/@ora-io/orap?style=flat&colorA=080f12&colorB=6e70d4
[npm-downloads-href]: https://npmjs.com/package/@ora-io/orap
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@ora-io/orap?style=flat&colorA=080f12&colorB=6e70d4&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=@ora-io/orap
[license-src]: https://img.shields.io/badge/License-MIT-yellow.svg?style=flat&colorA=080f12&colorB=6e70d4
[license-href]: https://github.com/ora-io/ora-stack/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=6e70d4
[jsdocs-href]: https://www.jsdocs.io/package/@ora-io/orap

ORAP is a declarative framework for building oracle services, handy to use out of the box.

## The Owl Rapper
> Show me you `Flow`s, I'll help you `assemble` to `Verse`s, which compose into a `Orap`. 
>
> `drop` the `Beat`s, let's `play`!

`Orap` provides 2 styles of usage:
- OO Style (Basic):
  - Use this framework as a basic tool set.
  - example: [customDemo](./examples/customDemo)
  - it's more flexible but cumbersome somehow. 
    - e.g. you can use your own storage other than Redis and Memory, e.g. mysql etc., for caching.
    - you can define your own Task structure and handle workflow.
- Declarative Style (Rap-lized): 
  - Use this as a declarative *Rap-lized* framework, writing oracle services just like rapping! **Coding Like a Rapper**
  - example: [declarativeDemo](./examples/declarativeDemo)
  - it's way more easy to implement, `Orap` handles most of the common part, e.g. signal handle, task defining, task caching, task fetch and processing, multitasks processing, etc., while it may sacrifice flexibility in some way.

Back in the scene, there are 2 internal layers in `Orap`:

- Basic Layer: 
  - mainly referring to the `Signal`, `StoreManager`, and `Task`, where the concepts are self-explained in engineering context.
  - it can be used directly by users.
- *Rap-lized* Layer: 
  - mainly referring to the `Flow`, `Verse`, and `Beat`, where the concepts are introduced by `Orap` only. 
  - it helps to build the declarative functionality, which is way easier for users and save some developers.
  - it mostly for internal developing purpose, and ~~should be~~ easy to scale and extend, though user also has access to them if they want.


> About Multi-chain: Currently Each `Orap` listens to only 1 blockchain network by design, similar to http servers. Create multiple `Orap` instances to implement multi-chain listener.
> 
> Suggest to include network in task `prefix()`, to avoid key collision in cache store


## Usage

### Declarative Style (Rap-lized)

It comes with rich features like customized task cache, multitasks handling etc.

Note the following already includes using Redis as the store to cache tasks, allowing continuation after service restart, it's reliable even when the service restarts.

```ts
import { ethers } from 'ethers'
import { Orap, StoreManager } from '@orap-io/orap'
import { Logger, redisStore } from '@ora-io/utils'

// new orap
const orap = new Orap()

// use redis
const store = redisStore()
const sm = new StoreManager(store)

// use a logger
const logger = new Logger('info', '[orap-raplize-sample]')

const handle1 = (...args: any) => { logger.log('handle task 1', args); return true }

const handle2 = (...args: any) => { logger.log('handle task 2', args); return true }

// define event signal with crosscheck, and customized cacheable tasks
// note: use redis as the cache layer
orap.event(eventSignalParam)
  .crosscheck(ccOptions)
  // add a task
  .task()
  .cache(sm)
  .prefix('ora-stack:orap:raplizeSample:Task-1:', 'ora-stack:orap:raplizeSample:Done-Task-1:')
  .ttl({ taskTtl: 120000, doneTtl: 60000 })
  .handle(handle1)
  // add another task
  .another()
  .task()
  .cache(sm)
  .prefix('ora-stack:orap:raplizeSample:Task-2:', 'ora-stack:orap:raplizeSample:Done-Task-2:')
  .ttl({ taskTtl: 120000, doneTtl: 60000 })
  .handle(handle2)

// set logger before listen
orap.logger(logger)

// start signal listeners
orap.listen(
  {
    wsProvider: new ethers.WebSocketProvider('wss://127.0.0.1'),
    httpProvider: new ethers.JsonRpcProvider('http://127.0.0.1')
  },
  () => { console.log('listening on provider.network') }
)
```

#### Orap Flow

Each `new Orap()` starts a `Orap Flow`

**.event(eventSignalParam, handlFn)**
- `eventSignalParam`: defines an event signal and enters an Event Flow
- `handlFn`: customized hook on new event received. 
  - `return true` to continue the rest of processes
  - `return false` to hijack the rest of processes

**.listen(options, onListenFn?)**
- `options`:
  - required: wsProvider, for subscription
  - optional: httpProvider, for crosscheck only, since crosscheck is based on getLogs
- `onListenFn`: customized hook when listener started.

**.logger(logger)**
- set which logger to use across this orap

#### Event Flow

Each `.event(...)` starts an `Event Flow`

**.crosscheck(...)**
- set an automated crosschecker for this event, to ensure the missing events of subscription will always be caught by `getLogs`. 
- this can mitigate the common unstable nature of WebSocket rpc providers and increase the service availability.

**.task()**
- add a task for this event type
- starts a `Task Flow`

**.handle(handlFn)**
- same as `.event(.., handlFn)`
- `handlFn`: customized hook on new event received. 
  - `return true` to continue the rest of processes
  - `return false` to hijack the rest of processes

**.another()**
- back to the parent `Orap Flow`, so that it can add another `.event`
- e.g. `orap.event(...).another().event(...)`

#### Task Flow

Each `.task(...)` starts a `Task Flow`

**.handle(handler: HandleFn)**
- set the task handler, the most important property for a task.
  - `return true` to identify handle success, and entering `onSuccess`
  - `return false` to identify handle failed, and entering `onSuccess`

**.cache(sm: StoreManager)**
- set the store to cache the tasks
- default: use memory as the cache layer

**.prefix(taskPrefix: Prefix, donePrefix: Prefix)**
- set the prefix of tasks in the store cache for management
- `donePrefix`: prefix of 'todo' tasks records
- `donePrefix`: prefix of 'done' tasks records
- default: "Task:" & "Done-Task:"

**.ttl({ taskTtl, doneTtl }: { taskTtl: number; doneTtl: number })**
- set the ttl of tasks in the store cache for management
- `donePrefix`: ttl of 'todo' tasks records
- `donePrefix`: ttl of 'done' tasks records
- default: no limit

**.key(toKey: ToKeyFn)**
- defines the primary key of a task based on the event values (i.e. log topics)
- default: random hex string

**.success(onSuccess: HandleResultFn)**
- defines how to process the task if the handler success
- default: remove the 'todo' task from & set the 'done' task record to the cache store

**.fail(onFail: HandleResultFn)**
- defines how to process the task if the handler success
- default: remove the 'todo' task from (ignore task)

**.context(ctx: Context)**
- optional: set the context that can be accessed to task functions

**.another()**
- back to the parent `Event Flow`, so that it can add another `.task`
- e.g. `orap.event(...).task().another().task()`

### OO Style (Basic)

Note the following doesn't include task cache, it only calls `handle` every time it receives an event. So this service is only for demo, don't use it for production, otherwise it may miss events when service down.

```ts
import { ethers } from 'ethers'
import { Orap } from '@orap-io/orap'

const orap = new Orap()

const eventSignalParam = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  abi: { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event' },
  eventName: 'Transfer',
}

const handle = (...args: any) => { console.log('handle', args) }

orap.event(eventSignalParam, handle)
  .crosscheck({ pollingInterval: 1000, batchBlocksCount: 1, blockInterval: 12000 })

orap.listen(
  {
    wsProvider: new ethers.WebSocketProvider('wss://127.0.0.1'),
    httpProvider: new ethers.JsonRpcProvider('http://127.0.0.1')
  },
  () => { console.log('listening on provider.network') }
)
```

## *Rap-lized* Layer

The following terminology is internally, can be transparent to users.

- A `Orap` compromises multiple `Verses`;
- Some `Verses` includes `Beat`s, which define the pace or incoming triggers of the song. 
- For users want to build a `Orap`: only need to define `Flow`s **intuitively**, the Owl Rapper will take care of all the rest things.

**Terminology**

- `Flow`: 
  - handling user-defined option flows, 
  - e.g. user can define following flows:
    ```typescript
    new Orap().event(..).crosscheck()
    .handle(..)
    .task(..).key(..).prefix(..).ttl(..)
    .handle(..)
    .another()
    .task(..).key(..).prefix(..).ttl(..)
    .handle(..)
    ```
- `Flow.assemble()`: 
  - wrap up the `Flow` definition and build a `Verse` based on it.
- `Verse`: 
  - equivalent to an executor/processor of the corresponding `Flow`.
- `Verse.play()`: 
  - equivalent to start/launch the executor/processor.
- `Beat`: 
  - a wrap of the `Signal`, which defines the incoming triggers that initiate the runtime process flow
    - e.g. `EventBeat` defines the event listener
  - `Beat` wraps `Signal` into a uniformed class with only the `constructor` and `drop()`, easy for `Verse` to handle
- `Beat.drop()`:
  - start the `Signal` listener process. **Drop the Beats!**

## Basic Layer

Basic Layer currently consists of 3 parts: 
- `Signal` defines the incoming trigger types
- `Task` defines the task types that handles signals
- `StorageManager` defines the cache interface, allowing tasks to be cached

### Signal

All events that arrive the oracle service and trigger following actions are defined as `Signal`, including:
- [x] `EventSignal`
- [ ] `BlockSignal`
- [ ] http request
etc.

**EventSignal**
- define event listener as simple as: `orap.event({address:"0x", abi:"", eventName: "Transfer"}, handleSignal)`
- natively integrate `crosschecker` features from [@ora-io/reku](https://github.com/ora-io/ora-stack/blob/main/packages/reku/), available config please check out `AutoCrossCheckParam` in `reku`
- each event signal only accept at most one crosschecker.
- `callback`: the user provided handle function to handle the new signals.

### Task

**TaskBase**
- provide universal `toString`, `fromString`, `stringify` 

**TaskStorable**
- provide store compatible features, i.e. load, save, remove, done
- overwrite when extends:
  - `toKey()` (required): define the primary key that identifies each task, **doesn't** include `taskPrefix`
  - `taskPrefix` (recommend): set the prefix of all tasks, also is used when `load` task
  - `taskPrefixDone` (recommend): set the prefix of finished tasks, only used in `done`; no need to set if you don't use "task.done(sm)"

### StorageManager
- a wrap class designed for caching tasks in Orap
- `store`: the store entity, currently provides 2 options: use memory or redis, checkout `orap/store`
- `queryDelay`: when doing retry-able operations, e.g. get all keys with the given prefix, this defines the interval between retries.