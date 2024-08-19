import { ethers } from "ethers"
import { Orap } from "../../orap"
// import { Orap } from '@orap-io/orap'

// new orap
const orap = new Orap()

const eventSignalParam = {
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  abi: { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event' },
  eventName: 'Transfer',
}

// define handle function
const handle = (...args: any) => { console.log('handle', args) }

// define event signal with crosscheck and link with handle function
// note: no cache functionality
orap.event(eventSignalParam, handle)
  .crosscheck({ pollingInterval: 1000, batchBlocksCount: 1, blockInterval: 12000 })

// start signal listeners
orap.listen(
  {
    wsProvider: new ethers.WebSocketProvider('wss://127.0.0.1'),
    httpProvider: new ethers.JsonRpcProvider('http://127.0.0.1')
  },
  () => { console.log('listening on provider.network') }
)