import type { Providers } from '@ora-io/reku'
import type { Fn } from '@ora-io/utils'
import type { Interface, InterfaceAbi } from 'ethers'
import { OrapVerse } from '../verse/orap'
import type { EventSignalRegisterParams } from '../signal'
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

  get eventFlows() {
    return this.subflows.event
  }

  event(params: EventSignalRegisterParams, handler?: HandleFn): EventFlow
  event(params: string, abi: Interface | InterfaceAbi | HandleFn, eventName: string, handler?: HandleFn): EventFlow
  event(params: EventSignalRegisterParams | string, abi?: Interface | InterfaceAbi | HandleFn, eventName?: string, handler?: HandleFn): EventFlow {
    if (typeof params === 'string')
      params = { address: params, abi: abi as Interface | InterfaceAbi, eventName: eventName as string }
    else
      handler = abi as HandleFn

    const eventFlow = new EventFlow(this, params, handler)
    this.subflows.event.push(eventFlow)
    return eventFlow
  }

  /**
   * .listen is an ending option, calling assemble() to wrap OrapFlow
   * @param options
   * @param onListenFn
   */
  listen(options: ListenOptions, onListenFn?: Fn) {
    for (const eventFlow of this.subflows.event) {
      eventFlow.setSubscribeProvider(options.wsProvider)
      if (options.httpProvider)
        eventFlow.setCrosscheckProvider(options.httpProvider)
    }

    if (onListenFn)
      this.onListenFn = onListenFn

    const orapVerse = this.assemble()
    orapVerse.play()
    this.onListenFn()
  }

  assemble(): OrapVerse {
    const eventVerses = this.subflows.event.map(flow => flow.assemble())
    return new OrapVerse(this).setEventVerses(eventVerses)
    // this.routes.event.push(es)
  }
}
