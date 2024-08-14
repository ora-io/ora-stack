<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/dev/assets/reku.logo.png?raw=true" alt="Reku Icon" width="200"  /></div>

# [WIP] Reku: Reliable ETH Kit & Utils

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
- `storeKeyPrefix`?: set the prefix to all keys when set key-value to store (cache), e.g. key = prefix+'txHashList', prefix can be "project:app:" to form a "project:app:txHashList" redis key., defult: ''
- `storeTtl`?: the ttl for <txhash, logindex> record in store, defualt: no limit
- `batchBlocksCount`?: how many blocks to get per `getLogs` check, in readtime mode it waits until the new block num >= `batchBlocksCount`.
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
