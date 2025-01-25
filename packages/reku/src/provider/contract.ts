import type { ContractAddress, Fn } from '@ora-io/utils'
import type { Interface, InterfaceAbi } from 'ethers'
import { ethers } from 'ethers'
import { debug } from '../debug'

export class RekuContractManager {
  private _contract?: ethers.Contract
  private _listeners: Map<ethers.ContractEventName, Fn> = new Map()

  constructor(public address: ContractAddress, public abi: Interface | InterfaceAbi, public provider: ethers.JsonRpcProvider | ethers.WebSocketProvider) {
    this._contract = new ethers.Contract(address, abi, provider)
  }

  get contract() {
    return this._contract
  }

  get listeners() {
    return this._listeners
  }

  addListener(event: ethers.ContractEventName, listener: ethers.Listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, listener)
      this._contract?.on(event, listener)
      debug('add listener %s %s', this.address, event)
    }
  }

  removeListener(event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contract?.removeListener(event, listener)
    this._listeners.delete(event)
    debug('remove listener %s %s', this.address, event)
  }

  removeAllListeners() {
    this._contract?.removeAllListeners()
    for (const [event, listener] of this._listeners)
      this._contract?.off(event, listener)

    this._listeners.clear()
  }

  retryAllListeners() {
    for (const [event, listener] of this._listeners) {
      this._contract?.off(event, listener)
      setTimeout(() => {
        this._contract?.on(event, listener)
      })
    }
  }

  retryListener(event: ethers.ContractEventName) {
    const listener = this._listeners.get(event)
    if (listener) {
      this._contract?.off(event, listener)
      this._contract?.on(event, listener)
    }
  }
}
