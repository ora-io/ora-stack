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
> Show you `Flow`s, I'll help you to `assemble` to `Verse`s, and `play` them, specifically, the whole song (orap) is played by `drop`ping the `Beat`s of the Signal verses.

`Orap` provides 2 ways for usage:
- Traditional:
  - Use this framework as a basic toolset.
  - example: [customDemo](./mock/customDemo)
  - it's more flexible but cumbersome somehow. 
    - e.g. you can use your own storage other than Redis and Memory, e.g. mysql etc., for caching.
    - you can define your own Task structure and handle workflow.
- Declarative: 
  - Use this as a declarative *Rap-lized* framework, writing oracle server as easy as rapping a song! (ok don't hit me, rap is not easy, but you know what I mean :P)
  - example: [declarativeDemo](./mock/declarativeDemo)
  - it's way more easy to implement, `Orap` handles most of the common part, e.g. signal handle, task defining, task caching, task fetch and processing, multitasks processing, etc., while it may sacrifice flexibility in some way.

Back in the scene, there are 2 internal systems in `Orap`:

- Traditional: 
  - mainly referring to the `Signal`, `StoreManager`, and `Task`, where the concepts are self-explained in engineering context.
  - it can be used directly by users.
- *Rap-lized*: 
  - mainly referring to the `Flow`, `Verse`, and `Beat`, where the concepts are introduced by `Orap` only. 
  - it helps to build the declarative functionality, which is way easier for users and save some developers.
  - it mostly for internal developing purpose, and ~~should be~~ easy to scale and extend, though user also has access to them if they want.

### *Rap-lized* Terminology

The following terminology is internally, can be transparent to users.

- `Flow`: handling user-defined option flows, 
  - e.g. this is supported by multiple flow types
    ```typescript
    new Orap().event(..).crosscheck()
    .handle(..)
    .task(..).key(..).prefix(..).ttl(..)
    .handle(..)
    .another()
    .task(..).key(..).prefix(..).ttl(..)
    .handle(..)
    ```
  - `assemble`: wrap up the `Flow` definition and build a `Verse` based on it.
- `Verse`: equivalent to an executor/processor of the corresponding `Flow`.
  - `play`: equivalent to start/launch the executor/processor.
- `Beat`: almost identical to `Signal`, wrap the `Signal` into a single phase class with only the `constructor` and `drop()`, easy for `Verse` to handle
  - `drop()`: start the `Signal` listener process. Drop the Beats!

## Usage

- TODO: add declarative usage

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
  .crosscheck({ pollingInterval: 1000, batchBlocksCount: 1, blockInterval: 12000 })

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
