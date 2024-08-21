import type { OrapFlow } from '../flow/orap'
import type { EventVerse } from './event'
import type { Verse } from './interface'

export class OrapVerse implements Verse {
  private eventVerses: EventVerse[] = []

  constructor(private flow: OrapFlow) {
  }

  play() {
    // this._listenChain(this.sub)
    for (const verse of this.eventVerses)
      verse.play()

    this.flow.onListenFn()
    // return this
  }

  setEventVerses(eventVerses: EventVerse[]) {
    this.eventVerses = eventVerses
    return this
  }

  // _listenChain(wsProvider: Providers | string, httpProvider?: Providers | string) {
  //   if (typeof wsProvider === 'string')
  //     wsProvider = new RekuProviderManager(wsProvider)
  //   if (httpProvider && typeof httpProvider === 'string')
  //     httpProvider = new RekuProviderManager(httpProvider)

  //   this.routes.event.forEach(es => es.listen(wsProvider as Providers, httpProvider as Providers))
  // }
}
