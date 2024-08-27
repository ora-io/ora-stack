import { ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SEPOLIA_HTTP, SEPOLIA_WSS } from '../../tests/config'
import { OrapFlow } from './orap'

describe('OrapFlow', () => {
  let wsProvider: any
  let httpProvider: any
  let orapFlow: OrapFlow

  beforeEach(() => {
    wsProvider = new ethers.WebSocketProvider(SEPOLIA_WSS)
    httpProvider = new ethers.JsonRpcProvider(SEPOLIA_HTTP)
    orapFlow = new OrapFlow()
  })

  it('should create an event flow', () => {
    const eventFlow = orapFlow.event()
    expect(eventFlow).toBeDefined()
    expect(orapFlow.eventFlows).toContain(eventFlow)
  })

  it('should listen for events', () => {
    const onListenFn = vi.fn()
    orapFlow.listen({ wsProvider, httpProvider }, onListenFn)
    expect(orapFlow.onListenFn).toBe(onListenFn)
  })

  it('should assemble the OrapVerse', () => {
    const eventFlow = orapFlow.event()
    const orapVerse = orapFlow.assemble()
    expect(orapVerse).toBeDefined()
    expect(eventFlow).toBeDefined()
    expect(orapFlow.eventFlows).toContain(eventFlow)
  })
})
