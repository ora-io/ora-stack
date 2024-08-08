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

  _listenChain(wsProvider: Providers, httpProvider?: Providers) {
    this.routes.event.forEach(es => es.listen(wsProvider, httpProvider))
  }

  listen(options: ListenOptions, onListen: any = () => {}) {
    this._listenChain(options.wsProvider, options.httpProvider)
    onListen()
    return this
  }
}
