import { ethers } from 'ethers'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sleep } from '@ora-io/utils'
import { ContractManager } from '../provider/contract'

describe('ContractManager', () => {
  let contractManager: ContractManager
  const address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  const abi: string[] = [
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
  ]
  const provider = new ethers.WebSocketProvider('wss://ethereum-rpc.publicnode.com')

  beforeEach(() => {
    contractManager = new ContractManager(address, abi, provider)
  })

  afterEach(() => {
    contractManager.removeAllListeners()
    vi.clearAllMocks()
  })

  test('should create a contract with the given address, ABI, and provider', async () => {
    const contractAddress = await contractManager.contract?.getAddress()
    expect(contractManager.contract).toBeInstanceOf(ethers.Contract)
    expect(contractAddress).toBe(address)
    expect(contractManager.contract?.interface).toEqual(new ethers.Interface(abi))
  })

  test('should add a listener for a contract event', async () => {
    const event = 'Transfer'
    const listener = vi.fn()
    contractManager.addListener(event, listener)
    expect(contractManager.listeners.size).toBe(1)
    expect(contractManager.listeners.get(event)).toBe(listener)
    const listenerCount = await contractManager.contract?.listenerCount(event)
    expect(listenerCount).toBe(1)
  })

  test('should not add duplicate listeners for the same event', async () => {
    const event = 'Transfer'
    const listener = vi.fn()
    contractManager.addListener(event, listener)
    contractManager.addListener(event, listener)
    expect(contractManager.listeners.size).toBe(1)
    const listenerCount = await contractManager.contract?.listenerCount(event)
    expect(listenerCount).toBe(1)
  })

  test('should remove a listener for a contract event', async () => {
    const event = 'Transfer'
    const listener = vi.fn()
    contractManager.addListener(event, listener)
    await contractManager.removeListener(event, listener)
    expect(contractManager.listeners.size).toBe(0)
    const listenerCount = await contractManager.contract?.listenerCount(event)
    expect(listenerCount).toBe(0)
  })

  test('should remove all listeners for the contract', async () => {
    const event1 = 'Transfer'
    const event2 = 'Approval'
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    contractManager.addListener(event1, listener1)
    contractManager.addListener(event2, listener2)
    await contractManager.removeAllListeners()
    expect(contractManager.listeners.size).toBe(0)
    expect(await contractManager.contract?.listenerCount(event1)).toBe(0)
    expect(await contractManager.contract?.listenerCount(event2)).toBe(0)
  })

  test('should retry all listeners for the contract', async () => {
    const event1 = 'Transfer'
    const event2 = 'Approval'
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    contractManager.addListener(event1, listener1)
    contractManager.addListener(event2, listener2)
    await contractManager.retryAllListeners()
    await sleep(1000)
    const event2ListenerCount = await contractManager.contract?.listenerCount(event1)
    const event1ListenerCount = await contractManager.contract?.listenerCount(event1)
    expect(event1ListenerCount).toBe(1)
    expect(event2ListenerCount).toBe(1)
  })

  test('should retry a specific listener for the contract event', async () => {
    const event = 'Transfer'
    const listener = vi.fn()
    contractManager.addListener(event, listener)
    contractManager.retryListener(event)
    expect(await contractManager.contract?.listenerCount(event)).toBe(1)
  })
})
