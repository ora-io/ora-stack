import { ProviderManager } from '@ora-io/rek'
import { EventSignal } from './signal/event'
import type { Providers } from './types'

export interface ListenOptions {
  wsProvider: Providers
  httpProvider?: Providers
}

export class Orap {
  routes: {
    event: EventSignal[]
  }

  constructor() {
    this.routes = {
      event: [],
    }
  }

  event(options: any, fn: any) {
    const es = new EventSignal(options, fn)
    this.routes.event.push(es)
    return es
  }

  _listenChain(wsProvider: Providers | string, httpProvider?: Providers | string) {
    if (typeof wsProvider === 'string')
      wsProvider = new ProviderManager(wsProvider)
    if (httpProvider && typeof httpProvider === 'string')
      httpProvider = new ProviderManager(httpProvider)
    this.routes.event.forEach(es => es.listen(wsProvider as Providers, httpProvider as Providers))
  }

  listen(options: ListenOptions, onListen: any = () => { }) {
    this._listenChain(options.wsProvider, options.httpProvider)
    onListen()
    return this
  }
}
