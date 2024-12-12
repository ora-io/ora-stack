<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/main/assets/reku.logo.png?raw=true" alt="Reku Icon" width="200"  /></div>

# [WIP] Reku: Reliable ETH Kit & Utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@ora-io/reku?style=flat&colorA=080f12&colorB=6e70d4
[npm-version-href]: https://npmjs.com/package/@ora-io/reku
[npm-downloads-src]: https://img.shields.io/npm/dm/@ora-io/reku?style=flat&colorA=080f12&colorB=6e70d4
[npm-downloads-href]: https://npmjs.com/package/@ora-io/reku
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@ora-io/reku?style=flat&colorA=080f12&colorB=6e70d4&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=@ora-io/reku
[license-src]: https://img.shields.io/badge/License-MIT-yellow.svg?style=flat&colorA=080f12&colorB=6e70d4
[license-href]: https://github.com/ora-io/ora-stack/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=6e70d4
[jsdocs-href]: https://www.jsdocs.io/package/@ora-io/reku

## Event Cross-Check
- used for cross-checking missing events using eth getLogs
- note: cross-check interval shouldn't < 5min, otherwise rpc call would be expensive. Recommend set to 1 hour + 50 blocks (for redundancy check).

### BaseCrossChecker
- `onMissingLog: FnOnMissingLog`: the callback function that will be called when there's a missing log found;
- `ignoreLogs?: SimpleLog[]` : it allows users to pass in the txhash list (,log index list) that already processed, let the crosschecker to ignore them.

**crossCheckRange**

**crossCheckRetro**

**crossCheckFrom**

### AutoCrossCheck
Conceptually it supports 'catchup', 'realtime', 'mix' modes, controled by `fromBlock` and `toBlock`;
- realtime mode: run over the latest block data; enter when `fromBlock` and `toBlock` are NOT present; starts from `latestblocknum+1` and never ends, always waits until `latestblocknum >= lastcheckpoint + batchBlocksCount`;
- catchup mode: run over historical block data; enter when `fromBlock` and `toBlock` is present; starts from `fromBlock` and ends at `toBlock`;
- mix mode: start in catchup mode and transit to realtime mode; enter when `fromBlock` is present and `toBlock` is NOT; auto-transit when `lastcheckpoint > latestblocknum - batchBlocksCount`;

i.e. It starts with 'realtime' mode by default.

Options:
- `store`?: the Store used to cache the <txhash, logindex> that already processed.
- `storeKeyPrefix`?: set the prefix to all keys when set key-value to store (cache), e.g. key = prefix+'txHashList', prefix can be "project:app:network:" to form a "project:app:network:txHashList" redis key., defult: ''
- `storeTtl`?: the ttl for <txhash, logindex> record in store, defualt: no limit
- `batchBlocksCount`?: how many blocks to get per `getLogs` check, in readtime mode it waits until the new block num >= `batchBlocksCount`. default: 10
- `delayBlockFromLatest`?: mostly for realtime mode; each time cc wait until `latest height > toBlock + delayBlockFromLatest`, default: 1
- `blockInterval`?: the block interval (in ms) of the given chain, default: 12000 for eth
- `pollingInterval`?: how long does it take between 2 block height check polling checks; mostly for limiting getLogs calling rate in catchup mode, default: 3000 ms
- `fromBlock`?: once specified, it means start catching up from historical blocks
- `toBlock`?: once specified, it means the crosscheck isn't infinite and will end at this height; need `fromBlock` present if this set

**Usage**
```ts
const acc = new AutoCrossChecker(provider)
await acc.start({
  onMissingLog,
  ignoreLogs,
  fromBlock: 20003371, // optional, empty to start from latest
  toBlock: 20003371, // optional, empty to enter continueous cc
  address: CONTRACT_ADDRESS,
  topics,
  batchBlocksCount: 1,
  pollingInterval: 3000,
})
```


## Provider Manager

`RekuProviderManager` is a TypeScript class designed to manage Ethereum providers and contracts. **It supports both WebSocket and JSON-RPC providers, includes heartbeat functionality to maintain the connection, and provides event listening and management features**.

### Usage

#### Import and Initialization

First, import the `RekuProviderManager` class:

```ts
import { RekuProviderManager } from '@ora-io/reku'
```

Then, create an instance of `RekuProviderManager`:

```ts
const providerManager = new RekuProviderManager('wss://your-ethereum-node-url', {
  heartbeatInterval: 5000, // Optional, default is 10 seconds
  disabledHeartbeat: false // Optional, whether to disable heartbeat
})
```
#### Adding Contracts

You can add a contract using its address and ABI:

```ts
const contractAddress = '0xYourContractAddress'
const contractAbi = [] // Your contract ABI

providerManager.addContract(contractAddress, contractAbi)
```

Or add a contract using an `ethers.Contract` instance:

```ts
const contract = new ethers.Contract(contractAddress, contractAbi, providerManager.provider)
providerManager.addContract(contractAddress, contract)
```

#### Event Listening

Adding Event Listeners

```ts
providerManager.addListener(contractAddress, 'EventName', (event) => {
  console.log('Event received:', event)
})
```

Removing Event Listeners

```ts
providerManager.removeListener(contractAddress, 'EventName', listener)
```

Removing All Event Listeners

```ts
providerManager.removeAllListeners()
```

#### Event Management

You can listen for `RekuProviderManager` errors and close events:

```ts
providerManager.on('error', (error) => {
  console.error('Provider error:', error)
})

providerManager.on('close', (code, reason) => {
  console.log(`Provider closed: ${code} - ${reason}`)
})
```

#### Reconnecting

You can manually reconnect to the provider:

```ts 
providerManager.reconnect()
```

#### Destroying

When you no longer need the `RekuProviderManager`, you can destroy it to free up resources:

```ts
providerManager.destroy()
```

### Configuration Options

The `RekuProviderManager` constructor accepts an optional configuration object:

**`heartbeatInterval`**: Heartbeat interval time (in milliseconds), default is 10 seconds.  
**`disabledHeartbeat`**: Whether to disable the heartbeat, default is false.


## Contract Manager


The `RekuContractManager` class is designed to manage Ethereum smart contracts using the ethers library. It provides methods to add, remove, and manage event listeners for contract events.

### Example Usage

```ts
import { ethers } from 'ethers'
import { RekuContractManager } from '@ora-io/reku'

const provider = new ethers.providers.WebSocketProvider('wss://your-ethereum-node-url')
const contractAddress = '0xYourContractAddress'
const contractAbi = [] // Your contract ABI

const manager = new RekuContractManager(contractAddress, contractAbi, provider)

// Adding an event listener
manager.addListener('EventName', (event) => {
  console.log('Event received:', event)
})

// Removing an event listener
manager.removeListener('EventName', listener)

// Removing all event listeners
manager.removeAllListeners()

// Retrying all event listeners
manager.retryAllListeners()

// Retrying a specific event listener
manager.retryListener('EventName')
```
