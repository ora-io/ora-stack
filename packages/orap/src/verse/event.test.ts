import { ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventFlow, OrapFlow } from '../flow'
import { EventBeat } from '../beat/event'
import { ERC20_ABI, USDT_ADDRESS } from '../../tests/config'
import { EventVerse } from './event'
import type { TaskVerse } from './task'

describe('EventVerse', () => {
  let orapFlow: OrapFlow
  let eventFlow: EventFlow
  let eventVerse: EventVerse

  beforeEach(() => {
    orapFlow = new OrapFlow()
    eventFlow = new EventFlow(orapFlow, { address: USDT_ADDRESS, abi: ERC20_ABI, eventName: 'Transfer' })
    eventVerse = new EventVerse(eventFlow)
  })

  it('should create tasks', async () => {
    const taskVerse1 = { createTask: vi.fn() } as unknown as TaskVerse
    const taskVerse2 = { createTask: vi.fn() } as unknown as TaskVerse
    eventVerse.setTaskVerses([taskVerse1, taskVerse2])

    await eventVerse._createTasks('arg1', 'arg2')

    expect(taskVerse1.createTask).toHaveBeenCalledWith('arg1', 'arg2')
    expect(taskVerse2.createTask).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should handle signal', async () => {
    const handleFn = vi.fn().mockResolvedValue(true)
    eventFlow.handle(handleFn)

    const taskVerse1 = { createTask: vi.fn() } as unknown as TaskVerse
    const taskVerse2 = { createTask: vi.fn() } as unknown as TaskVerse
    eventVerse.setTaskVerses([taskVerse1, taskVerse2])

    await eventVerse.handleSignal('arg1', 'arg2', 'event payload')
    expect(handleFn).toHaveBeenCalledWith('arg1', 'arg2', 'event payload')
    expect(taskVerse1.createTask).toHaveBeenCalledWith('arg1', 'arg2', 'event payload')
    expect(taskVerse2.createTask).toHaveBeenCalledWith('arg1', 'arg2', 'event payload')
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

  it('should stop event verse', () => {
    const eventBeatStop = vi.fn()
    vi.spyOn(EventBeat.prototype, 'stop').mockImplementation(eventBeatStop)

    // Mock the _play method to avoid actual EventBeat creation
    vi.spyOn(eventVerse as any, '_play').mockImplementation(() => {
      // Create a mock eventBeat
      (eventVerse as any).eventBeat = {
        stop: eventBeatStop,
      }
    })

    // Call play first to create the eventBeat
    eventVerse.play()
    // Then call stop
    eventVerse.stop()

    expect(eventBeatStop).toHaveBeenCalled()
  })
})
