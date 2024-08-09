import type { Fn } from '@ora-io/utils'
import type { Interface, InterfaceAbi } from 'ethers'
import { ethers } from 'ethers'

export class ContractManager {
  private _contract?: ethers.Contract
  private _listenters: Map<ethers.ContractEventName, Fn> = new Map()

  constructor(public address: string, public abi: Interface | InterfaceAbi, public provider: ethers.JsonRpcProvider | ethers.WebSocketProvider) {
    this._contract = new ethers.Contract(address, abi, provider)
  }

  get contract() {
    return this._contract
  }

  get listeners() {
    return this._listenters
  }

  addListener(event: ethers.ContractEventName, listener: ethers.Listener) {
    if (!this._listenters.has(event)) {
      this._listenters.set(event, listener)
      this._contract?.on(event, listener)
    }
  }

  removeListener(event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contract?.removeListener(event, listener)
    this._listenters.delete(event)
  }

  removeAllListener() {
    this._contract?.removeAllListeners()
    this._listenters.clear()
  }

  retryAllListener() {
    this._listenters.forEach((value, key) => {
      this._contract?.off(key, value)
      this._contract?.on(key, value)
    })
  }

  retryListener(event: ethers.ContractEventName) {
    const listenter = this._listenters.get(event)
    if (listenter) {
      this._contract?.off(event, listenter)
      this._contract?.on(event, listenter)
    }
  }
}
