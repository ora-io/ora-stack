import { EventEmitter } from 'node:events'
import type { InterfaceAbi } from 'ethers'
import { Interface, WebSocketProvider, ethers } from 'ethers'
import type { ErrorEvent, WebSocket } from 'ws'
import { ContractManager } from './contract'

export interface RekuProviderManagerOptions {
  /**
   * The interval of heartbeat, default is 10s
   */
  heartbeatInterval?: number
  /**
   * Disable heartbeat
   */
  disabledHeartbeat?: boolean
}

export type RekuProviderManagerEvent = 'error' | 'close'

export class RekuProviderManager {
  private _provider?: ethers.JsonRpcProvider | ethers.WebSocketProvider
  private _contracts: Map<string, ContractManager> = new Map()

  private _heartbeatInterval = 10 * 1000

  private _heartbeatTimer?: NodeJS.Timeout

  private _event?: EventEmitter

  constructor(public providerUrl: string, private _options?: RekuProviderManagerOptions) {
    this.connect()
    if (_options?.heartbeatInterval)
      this._heartbeatInterval = _options.heartbeatInterval

    this._handleError()
    this._sendHeartbeat()
  }

  connect() {
    const url = new URL(this.providerUrl)
    if (url.protocol === 'ws:' || url.protocol === 'wss:')
      this._provider = new ethers.WebSocketProvider(this.providerUrl)
    else
      this._provider = new ethers.JsonRpcProvider(this.providerUrl)
  }

  get provider() {
    return this._provider as ethers.JsonRpcProvider | WebSocketProvider
  }

  get contracts() {
    return this._contracts
  }

  addContract(address: string, contract: ethers.Contract): ContractManager | undefined
  addContract(address: string, abi: Interface | InterfaceAbi): ContractManager | undefined
  addContract(address: string, abi: Interface | InterfaceAbi | ethers.Contract): ContractManager | undefined {
    if (this._provider) {
      if (abi instanceof Interface || Array.isArray(abi)) {
        if (!abi)
          throw new Error('ABI must be provided when address is a string')

        const contract = new ContractManager(address, abi, this._provider)
        this._contracts.set(address, contract)
        return contract
      }
      else if (abi instanceof ethers.Contract) {
        const contract = new ContractManager(address, abi.interface, this._provider)
        this._contracts.set(address, contract)
        return contract
      }
      else {
        throw new TypeError('Invalid contract')
      }
    }
    return undefined
  }

  addListener(contractAddress: string, event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contracts.get(contractAddress)?.addListener(event, listener)
  }

  removeListener(contractAddress: string, event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contracts.get(contractAddress)?.removeListener(event, listener)
  }

  removeAllListeners() {
    this._provider?.removeAllListeners()
    this._contracts.forEach((contract) => {
      contract.removeAllListeners()
    })
  }

  removeAllContract() {
    this._contracts.forEach((contract) => {
      contract.removeAllListeners()
    })
    this._contracts.clear()
  }

  retryAllListeners() {
    this._contracts.forEach((contract) => {
      contract.retryAllListeners()
    })
  }

  on(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    if (!this._event)
      this._event = new EventEmitter()

    this._event?.on(event, listener)
  }

  once(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    if (!this._event)
      this._event = new EventEmitter()

    this._event?.once(event, listener)
  }

  removeEvent(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    this._event?.removeListener(event, listener)
  }

  removeAllEvents() {
    this._event?.removeAllListeners()
  }

  reconnect() {
    // destroy heartbeat
    this._clearHeartbeat()
    this._heartbeatTimer = undefined

    // remove all contract listeners
    this._provider?.removeAllListeners()
    this._contracts.forEach((contract) => {
      contract.contract?.removeAllListeners()
    })

    // remove all listeners, just only for websocket provider
    if (this._provider instanceof WebSocketProvider) {
      const socket = this._provider.websocket as WebSocket
      socket.removeAllListeners()
      socket.onerror = null
    }
    this._provider?.destroy()
    this._provider = undefined

    setTimeout(() => {
      // reconnect provider
      this.connect()
      // reset contracts
      const contracts: Map<string, ContractManager> = new Map()
      this._contracts.forEach((contract) => {
        if (this._provider) {
          const newContract = new ContractManager(contract.address, contract.abi, this._provider)
          contract.listeners.forEach((listener, event) => {
            newContract.addListener(event, listener)
          })
          contracts.set(contract.address, newContract)
        }
      })
      this._contracts.clear()
      this._contracts = contracts
      // resend heartbeat
      this._sendHeartbeat()
    }, 100)
  }

  private _sendHeartbeat() {
    if (this._options?.disabledHeartbeat)
      return
    this._heartbeatTimer = setInterval(() => {
      this._provider?.send('net_version', [])
        .then()
        .catch((err) => {
          this.reconnect()
          this._event?.emit('error', err)
        })
    }, this._heartbeatInterval)
  }

  private _clearHeartbeat() {
    if (this._heartbeatTimer)
      clearInterval(this._heartbeatTimer)
  }

  private _handleError() {
    this._provider?.on('error', () => {
      this.reconnect()
      this._event?.emit('error', new Error('provider error'))
    })

    if (this._provider instanceof ethers.WebSocketProvider) {
      const websocket = this._provider.websocket as WebSocket
      websocket.onerror = (event: ErrorEvent) => {
        this.reconnect()
        this._event?.emit('error', new Error('websocket error'), event)
      }
      websocket.on?.('close', (code: number, reason: string) => {
        this.reconnect()
        this._event?.emit('close', code, reason)
      })
    }
  }

  destroy() {
    this._clearHeartbeat()
    this._provider?.removeAllListeners()
    this._provider?.destroy()
    this._provider = undefined
    this._contracts.forEach((contract) => {
      contract.removeAllListeners()
    })
    this._contracts.clear()
    this._event?.removeAllListeners()
    this._event = undefined
  }
}
