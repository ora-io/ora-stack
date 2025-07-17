import { ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventVerse } from '../verse/event'
import { OrapFlow } from './orap'
import { EventFlow } from './event'

describe('EventFlow', () => {
  let orapFlow: OrapFlow
  let eventFlow: EventFlow

  beforeEach(() => {
    orapFlow = new OrapFlow()
    eventFlow = new EventFlow(orapFlow)
  })

  it('should create a task flow', () => {
    const taskFlow = eventFlow.task()
    expect(taskFlow).toBeDefined()
    expect(eventFlow.taskFlows).toContain(taskFlow)
  })

  it('should set the subscribe provider', () => {
    const provider = new ethers.JsonRpcProvider()
    eventFlow.setSubscribeProvider(provider)
    expect(eventFlow.subscribeProvider).toBe(provider)
  })

  it('should set the crosscheck provider', () => {
    const provider = new ethers.JsonRpcProvider()
    eventFlow.setCrosscheckProvider(provider)
    expect(eventFlow.crosscheckProvider).toBe(provider)
  })

  it('should set the handle function', () => {
    const handleFn = () => true
    eventFlow.handle(handleFn)
    expect(eventFlow.handleFn).toBe(handleFn)
  })

  it('should assemble the EventVerse', () => {
    const taskFlow = eventFlow.task()
    const eventVerse = eventFlow.assemble()
    expect(eventVerse).toBeDefined()
    expect(taskFlow).toBeDefined()
    expect(eventFlow.taskFlows).toContain(taskFlow)
  })

  it('should return the parent OrapFlow', () => {
    const parentFlow = eventFlow.another()
    expect(parentFlow).toBe(orapFlow)
  })

  it('should stop the EventVerse', () => {
    const stopFn = vi.fn()
    vi.spyOn(EventVerse.prototype, 'stop').mockImplementation(stopFn)
    eventFlow.stop()
    expect(stopFn).toHaveBeenCalled()
  })
})
