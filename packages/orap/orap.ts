import type { Providers } from '@ora-io/reku'
import { RekuProviderManager } from '@ora-io/reku'
import type { Logger } from '@ora-io/utils'
import { logger } from '@ora-io/utils'
import { EventSignal } from './signal/event'
import type { Context } from './context'

export interface ListenOptions {
  wsProvider: Providers
  httpProvider?: Providers
}

export class Orap {
  routes: {
    event: EventSignal[]
  }

  logger: Logger = logger

  constructor() {
    this.routes = {
      event: [],
    }
  }

  event(options: any, fn: any, context?: Context) {
    const es = new EventSignal(options, fn, this.logger, context)
    this.routes.event.push(es)
    return es
  }

  _listenChain(wsProvider: Providers | string, httpProvider?: Providers | string) {
    if (typeof wsProvider === 'string')
      wsProvider = new RekuProviderManager(wsProvider)
    if (httpProvider && typeof httpProvider === 'string')
      httpProvider = new RekuProviderManager(httpProvider)
    this.routes.event.forEach(es => es.listen(wsProvider as Providers, httpProvider as Providers))
  }

  listen(options: ListenOptions, onListen: any = () => { }) {
    this._listenChain(options.wsProvider, options.httpProvider)
    onListen()
    return this
  }

  setLogger(logger: Logger) {
    this.logger = logger
  }
}
