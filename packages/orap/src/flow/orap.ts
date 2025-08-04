import type { Providers } from '@ora-io/reku'
import type { ContractAddress, Fn } from '@ora-io/utils'
import { isAddressable } from 'ethers'
import type { Interface, InterfaceAbi } from 'ethers'
import { OrapVerse } from '../verse/orap'
import type { EventSignalRegisterParams } from '../signal'
import { debug } from '../debug'
import { EventFlow } from './event'
import type { Flow, HandleFn } from './interface'

export interface ListenOptions {
  wsProvider: Providers
  httpProvider?: Providers
}

/**
 * a special flow, the only usage is to be extended by Orap class
 */
export class OrapFlow implements Flow {
  private subflows: {
    event: EventFlow[]
  } = { event: [] }

  onListenFn: Fn = () => { }
  _wsProvider?: Providers
  _httpProvider?: Providers

  get eventFlows() {
    return this.subflows.event
  }

  get wsProvider() {
    return this._wsProvider
  }

  get httpProvider() {
    return this._httpProvider
  }

  private _verse: OrapVerse = new OrapVerse(this)

  get verse() {
    return this._verse
  }

  event(params: EventSignalRegisterParams, handler?: HandleFn): EventFlow
  event(address: ContractAddress | ContractAddress[], abi: Interface | InterfaceAbi | HandleFn, eventName: string, handler?: HandleFn): EventFlow
  event(params: EventSignalRegisterParams | ContractAddress | ContractAddress[], abi?: Interface | InterfaceAbi | HandleFn, eventName?: string, handler?: HandleFn): EventFlow {
    if (typeof params === 'string' || isAddressable(params) || Array.isArray(params))
      params = { address: params, abi: abi as Interface | InterfaceAbi, eventName: eventName as string }
    else handler = abi as HandleFn

    const eventFlow = new EventFlow(this, params, handler)
    this.subflows.event.push(eventFlow)
    debug('The event %s is registered, address: %s', params.eventName, params.address)
    return eventFlow
  }

  /**
   * .listen is an ending option, calling assemble() to wrap OrapFlow
   * @param options
   * @param onListenFn
   */
  listen(options: ListenOptions, onListenFn?: Fn): this {
    for (const eventFlow of this.subflows.event) {
      eventFlow.setSubscribeProvider(options.wsProvider)
      if (options.httpProvider)
        eventFlow.setCrosscheckProvider(options.httpProvider)
    }
    this._wsProvider = options.wsProvider
    this._httpProvider = options.httpProvider

    if (onListenFn)
      this.onListenFn = onListenFn
    const eventVerses = this.subflows.event.map(flow => flow.verse)
    this._verse.setEventVerses(eventVerses)

    this._verse.play()
    this.onListenFn()
    return this
  }

  stop(): this {
    this._verse.stop()
    return this
  }

  restart(): this {
    this._verse.restart()
    return this
  }

  assemble(): OrapVerse {
    const eventVerses = this.subflows.event.map(flow => flow.assemble())
    return new OrapVerse(this).setEventVerses(eventVerses)
  }
}
