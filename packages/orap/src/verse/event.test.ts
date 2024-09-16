import { ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Fn } from '@ora-io/utils'
import { EventFlow, OrapFlow } from '../flow'
import { EventBeat } from '../beat/event'
import { EventVerse } from './event'
import type { TaskVerse } from './task'

describe('EventVerse', () => {
  let orapFlow: OrapFlow
  let eventFlow: EventFlow
  let eventVerse: EventVerse

  beforeEach(() => {
    orapFlow = new OrapFlow()
    eventFlow = new EventFlow(orapFlow)
    eventVerse = new EventVerse(eventFlow)
  })

  it('should create tasks', async () => {
    const taskVerse1 = {
      createTask: vi.fn(async (...args: any[]) => {
        const next = args.pop() as Fn
        await next()
      }),
    } as unknown as TaskVerse
    const taskVerse2 = {
      createTask: vi.fn(async (...args: any[]) => {
        const next = args.pop() as Fn
        await next()
      }),
    } as unknown as TaskVerse
    eventVerse.setTaskVerses([taskVerse1, taskVerse2])

    await eventVerse._createTasks('arg1', 'arg2')
    expect(taskVerse1.createTask).toHaveBeenCalledWith('arg1', 'arg2', expect.any(Function))
    expect(taskVerse2.createTask).toHaveBeenCalledWith('arg1', 'arg2', expect.any(Function))
  })

  it('should handle signal', async () => {
    const handleFn = vi.fn().mockResolvedValue(true)
    eventFlow.handle(handleFn)

    const taskVerse1 = {
      createTask: vi.fn(async (...args: any[]) => {
        const next = args.pop() as Fn
        await next()
      }),
    } as unknown as TaskVerse
    const taskVerse2 = {
      createTask: vi.fn(async (...args: any[]) => {
        const next = args.pop() as Fn
        await next()
      }),
    } as unknown as TaskVerse
    eventVerse.setTaskVerses([taskVerse1, taskVerse2])

    await eventVerse.handleSignal('arg1', 'arg2', 'event payload')
    expect(handleFn).toHaveBeenCalledWith('arg1', 'arg2', 'event payload')
    expect(taskVerse1.createTask).toHaveBeenCalledWith('arg1', 'arg2', 'event payload', expect.any(Function))
    expect(taskVerse2.createTask).toHaveBeenCalledWith('arg1', 'arg2', 'event payload', expect.any(Function))
  })

  it('should play task verses', () => {
    const taskVerse1 = { play: vi.fn() } as unknown as TaskVerse
    const taskVerse2 = { play: vi.fn() } as unknown as TaskVerse
    eventVerse.setTaskVerses([taskVerse1, taskVerse2]);
    // mock event verse _playTaskVerses fn
    (eventVerse as any)._play = vi.fn()
    eventVerse.play()
    expect(taskVerse1.play).toHaveBeenCalled()
    expect(taskVerse2.play).toHaveBeenCalled()
  })

  it('should play event verse', () => {
    const handleSignal = vi.fn().mockResolvedValue(true)
    const eventBeatDrop = vi.fn()

    vi.mock('../signal/event', async () => ({
      EventSignal: class EventSignal {
        constructor() { }
        async callback() { }
        listen() { }
      },
    }))

    vi.spyOn(EventBeat.prototype, 'drop').mockImplementation(eventBeatDrop)
    eventFlow.handle(handleSignal)
    eventFlow.setSubscribeProvider(new ethers.JsonRpcProvider())
    eventFlow.setCrosscheckProvider(new ethers.JsonRpcProvider())

    eventVerse.play()

    expect(eventBeatDrop).toHaveBeenCalled()
  })
})
