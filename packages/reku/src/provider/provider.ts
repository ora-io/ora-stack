import { EventEmitter } from 'node:events'
import type { InterfaceAbi } from 'ethers'
import { Interface, WebSocketProvider, ethers } from 'ethers'
import { WebSocket } from 'ws'
import type { ErrorEvent } from 'ws'
import { type ContractAddress, isInstanceof, to } from '@ora-io/utils'
import { debug } from '../debug'
import { RekuContractManager } from './contract'

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
  private _contracts: Map<ContractAddress, RekuContractManager> = new Map()

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
    if (this.isWebSocketProviderUrl)
      this._provider = new ethers.WebSocketProvider(this.providerUrl)
    else
      this._provider = new ethers.JsonRpcProvider(this.providerUrl)
  }

  get isWebSocketProviderUrl() {
    const url = new URL(this.providerUrl)
    return url.protocol === 'ws:' || url.protocol === 'wss:'
  }

  get provider() {
    return this._provider as ethers.JsonRpcProvider | WebSocketProvider
  }

  get contracts() {
    return this._contracts
  }

  get websocket() {
    if (isInstanceof(this._provider, ethers.WebSocketProvider))
      return this._provider.websocket
    return undefined
  }

  get destroyed() {
    return this._provider?.destroyed
  }

  addContract(address: ContractAddress, contract: ethers.Contract): RekuContractManager | undefined
  addContract(address: ContractAddress, abi: Interface | InterfaceAbi): RekuContractManager | undefined
  addContract(address: ContractAddress, abi: Interface | InterfaceAbi | ethers.Contract): RekuContractManager | undefined {
    if (this._provider) {
      if (abi instanceof Interface || Array.isArray(abi)) {
        if (!abi)
          throw new Error('ABI must be provided when address is a string')

        const contract = new RekuContractManager(address, abi, this._provider)
        this._contracts.set(address, contract)
        debug('add contract %s', address)
        return contract
      }
      else if (abi instanceof ethers.Contract) {
        const contract = new RekuContractManager(address, abi.interface, this._provider)
        this._contracts.set(address, contract)
        debug('add contract %s', address)
        return contract
      }
      else {
        throw new TypeError('Invalid contract')
      }
    }
    return undefined
  }

  addListener(contractAddress: ContractAddress, event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contracts.get(contractAddress)?.addListener(event, listener)
  }

  removeListener(contractAddress: ContractAddress, event: ethers.ContractEventName, listener: ethers.Listener) {
    this._contracts.get(contractAddress)?.removeListener(event, listener)
  }

  removeAllListeners() {
    debug('remove all listeners')
    this._provider?.removeAllListeners()
    this._contracts.forEach((contract) => {
      contract.removeAllListeners()
    })
  }

  removeAllContract() {
    debug('remove all contracts')
    this._contracts.forEach((contract) => {
      contract.removeAllListeners()
    })
    this._contracts.clear()
  }

  retryAllListeners() {
    debug('retry all listeners')
    this._contracts.forEach((contract) => {
      contract.retryAllListeners()
    })
  }

  on(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    if (!this._event)
      this._event = new EventEmitter()

    debug('on %s', event)
    this._event?.on(event, listener)
  }

  once(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    if (!this._event)
      this._event = new EventEmitter()

    debug('once %s', event)
    this._event?.once(event, listener)
  }

  removeEvent(event: RekuProviderManagerEvent, listener: (...args: any[]) => void) {
    debug('remove event %s', event)
    this._event?.removeListener(event, listener)
  }

  removeAllEvents() {
    debug('remove all events')
    this._event?.removeAllListeners()
  }

  reconnect() {
    debug('reconnect provider running...')
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
      debug('remove all listeners of websocket provider')
    }
    debug('reconnect destroyed: %s', this._provider?.destroyed)
    if (this._provider && !this._provider.destroyed) {
      if (isInstanceof(this._provider, ethers.WebSocketProvider)) {
        debug('reconnect websocket readyState: %s', this.websocket?.readyState)
        if (this.websocket?.readyState !== WebSocket.CONNECTING)
          to(Promise.resolve(this._provider.destroy()))
      }
      else {
        to(Promise.resolve(this._provider.destroy()))
      }
    }

    this._provider = undefined

    setTimeout(() => {
      debug('reconnect provider start')
      // reconnect provider
      this.connect()
      // reset contracts
      const contracts: Map<ContractAddress, RekuContractManager> = new Map()
      this._contracts.forEach((contract) => {
        if (this._provider) {
          const newContract = new RekuContractManager(contract.address, contract.abi, this._provider)
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
      debug('reconnect provider end')
    }, 100)
  }

  private _sendHeartbeat() {
    if (this._options?.disabledHeartbeat)
      return
    debug('start heartbeat')
    this._heartbeatTimer = setInterval(async () => {
      if (!this.destroyed) {
        debug('heartbeat running...')
        const hasProvider = this._hasProvider()
        debug('heartbeat has provider: %s', hasProvider)
        this._provider?.send('net_version', [])
          .then((res) => {
            debug('heartbeat response: %s', res)
          })
          .catch((err) => {
            this.reconnect()
            this._event?.emit('error', err)
            debug('heartbeat error: %s', err)
          })
          .finally(() => {
            debug('heartbeat finally')
          })
      }
      else {
        debug('heartbeat destroyed')
      }
    }, this._heartbeatInterval)
  }

  private _hasProvider() {
    const hasProvider = !!this._provider && !!this._provider.provider
    let isInstance = false
    if (this.isWebSocketProviderUrl)
      isInstance = isInstanceof(this._provider, ethers.WebSocketProvider) && isInstanceof(this._provider.provider, ethers.WebSocketProvider)
    else
      isInstance = isInstanceof(this._provider, ethers.JsonRpcProvider) && isInstanceof(this._provider.provider, ethers.JsonRpcProvider)

    return hasProvider && isInstance && !this._provider?.destroyed
  }

  private _clearHeartbeat() {
    if (this._heartbeatTimer) {
      debug('clear heartbeat')
      clearInterval(this._heartbeatTimer)
    }
  }

  private _handleError() {
    this._provider?.on('error', () => {
      debug('provider error event emitted')
      this.reconnect()
      this._event?.emit('error', new Error('provider error'))
    })

    if (this._provider instanceof ethers.WebSocketProvider) {
      const websocket = this._provider.websocket as WebSocket
      websocket.onerror = (event: ErrorEvent) => {
        debug('websocket error event emitted')
        this.reconnect()
        this._event?.emit('error', new Error('websocket error'), event)
      }
      websocket.on?.('close', (code: number, reason: string) => {
        debug('websocket close event emitted')
        this.reconnect()
        this._event?.emit('close', code, reason)
      })
    }
  }

  destroy() {
    debug('destroy provider running...')
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
    debug('destroy provider end')
  }
}
