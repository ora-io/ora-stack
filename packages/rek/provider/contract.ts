import type { Fn } from '@ora-io/utils'
import type { Interface, InterfaceAbi } from 'ethers'
import { ethers } from 'ethers'

export class ContractManager {
  private _contract?: ethers.Contract
  private _listeners: Map<ethers.ContractEventName, Fn> = new Map()

  constructor(public address: string, public abi: Interface | InterfaceAbi, public provider: ethers.JsonRpcProvider | ethers.WebSocketProvider) {
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
    }
  }

  removeListener(event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contract?.removeListener(event, listener)
    this._listeners.delete(event)
  }

  removeAllListeners() {
    this._contract?.removeAllListeners()
    this._listeners.clear()
  }

  retryAllListeners() {
    this._listeners.forEach((listener, event) => {
      this._contract?.off(event, listener)
      this._contract?.on(event, listener)
    })
  }

  retryListener(event: ethers.ContractEventName) {
    const listener = this._listeners.get(event)
    if (listener) {
      this._contract?.off(event, listener)
      this._contract?.on(event, listener)
    }
  }
}
