import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventVerse } from '../verse/event'
import { EventFlow, OrapFlow } from '../flow'
import { OrapVerse } from './orap'

describe('OrapVerse', () => {
  let orapFlow: OrapFlow
  let orapVerse: OrapVerse
  let eventVerse: EventVerse

  beforeEach(() => {
    orapFlow = new OrapFlow()
    orapVerse = new OrapVerse(orapFlow)
    eventVerse = new EventVerse(new EventFlow(orapFlow))
  })

  it('should play the OrapVerse', () => {
    vi.mock('../signal/event', async () => ({
      EventSignal: class EventSignal {
        constructor() { }
        async callback() { }
        listen() { }
      },
    }))
    orapFlow.onListenFn = vi.fn()
    const playSpy = vi.spyOn(eventVerse, 'play')
    orapVerse.setEventVerses([eventVerse])
    orapVerse.play()
    expect(playSpy).toHaveBeenCalled()
    expect(orapFlow.onListenFn).toHaveBeenCalled()
  })

  it('should set the event verses', () => {
    const eventVerses: EventVerse[] = [eventVerse]
    orapVerse.setEventVerses(eventVerses)
    expect(orapVerse.eventVerses).toEqual(eventVerses)
  })
})
