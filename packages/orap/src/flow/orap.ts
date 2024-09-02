import type { Providers } from '@ora-io/reku'
import { OrapVerse } from '../verse/orap'
import type { EventSignalRegisterParams } from '../signal'
import { EventFlow } from './event'
import type { Flow } from './interface'

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

  onListenFn: any = () => { }

  get eventFlows() {
    return this.subflows.event
  }

  event(options?: EventSignalRegisterParams, handler?: any): EventFlow {
    const eventFlow = new EventFlow(this, options, handler)
    this.subflows.event.push(eventFlow)
    return eventFlow
  }

  /**
   * .listen is an ending option, calling assemble() to wrap OrapFlow
   * @param options
   * @param onListenFn
   */
  listen(options: ListenOptions, onListenFn: any = () => { }) {
    for (const eventFlow of this.subflows.event) {
      eventFlow.setSubscribeProvider(options.wsProvider)
      if (options.httpProvider)
        eventFlow.setCrosscheckProvider(options.httpProvider)
    }

    this.onListenFn = onListenFn

    const orapVerse = this.assemble()
    orapVerse.play()
  }

  assemble(): OrapVerse {
    const eventVerses = this.subflows.event.map(flow => flow.assemble())
    return new OrapVerse(this).setEventVerses(eventVerses)
    // this.routes.event.push(es)
  }
}
