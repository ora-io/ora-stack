import { ethers } from 'ethers'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sleep } from '@ora-io/utils'
import type { RekuProviderManagerOptions } from '../src/provider/provider'
import { RekuProviderManager } from '../src/provider/provider'

vi.mock('ethers', async () => {
  const originalModule = await vi.importActual<typeof import('ethers')>('ethers')
  return {
    ...originalModule,
    WebSocketProvider: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      destroy: vi.fn(),
      websocket: {
        on: vi.fn(),
        removeAllListeners: vi.fn(),
        onerror: null,
      },
    })),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      destroy: vi.fn(),
    })),
    Contract: vi.fn(),
  }
})

describe('RekuProviderManager', () => {
  let providerManager: RekuProviderManager
  const providerUrl = 'http://localhost:8545'

  beforeEach(() => {
    providerManager = new RekuProviderManager('http://localhost:8545')
  })

  afterEach(() => {
    providerManager.destroy()
    vi.clearAllMocks()
  })

  test('should initialize with default heartbeat interval', () => {
    expect((providerManager as any)._heartbeatInterval).toBe(10000)
  })

  test('should initialize with custom heartbeat interval', () => {
    const options: RekuProviderManagerOptions = { heartbeatInterval: 5000 }
    providerManager = new RekuProviderManager(providerUrl, options)
    expect((providerManager as any)._heartbeatInterval).toBe(5000)
  })

  test('should add a contract to the contracts map', () => {
    const address = '0x1234567890abcdef'
    const contract = new ethers.Contract(address, [], providerManager.provider)

    providerManager.addContract(address, contract)

    expect(providerManager.contracts.size).toBe(1)
    expect(providerManager.contracts.get(address)).toBeDefined()
  })

  test('should add a contract with ABI to the contracts map', () => {
    const address = '0x1234567890abcdef'
    const abi: string[] = []

    providerManager.addContract(address, abi)

    expect(providerManager.contracts.size).toBe(1)
    expect(providerManager.contracts.get(address)).toBeDefined()
  })

  test('should add a contract with ethers.Interface to the contracts map', () => {
    const address = '0x1234567890abcdef'
    const abi = new ethers.Interface([])

    providerManager.addContract(address, abi)

    expect(providerManager.contracts.size).toBe(1)
    expect(providerManager.contracts.get(address)).toBeDefined()
  })

  test('should not add a contract when provider is not set', () => {
    providerManager = new RekuProviderManager('http://localhost:8545', { heartbeatInterval: 500 })

    const address = '0x1234567890abcdef'
    const contract = new ethers.Contract(address, [], providerManager.provider)

    providerManager.destroy() // Destroy the provider to simulate provider not being set

    providerManager.addContract(address, contract)

    expect(providerManager.contracts.size).toBe(0)
    expect(providerManager.contracts.get(address)).toBeUndefined()
  })

  test('should handle provider error and reconnect', async () => {
    const mockReconnect = vi.spyOn(providerManager, 'reconnect');
    (providerManager as any)._handleError()
    providerManager.provider?.emit('error')
    await sleep(100)
    expect(mockReconnect).toHaveBeenCalled()
  })

  test('should emit error event on provider error', () => {
    providerManager.on('error', (err) => {
      expect(err).toBeInstanceOf(Error)
    });
    (providerManager as any)._handleError()
    providerManager.provider?.emit('error')
  })

  test('should clear heartbeat on destroy', () => {
    const mockClearHeartbeat = vi.spyOn(providerManager as any, '_clearHeartbeat')
    providerManager.destroy()
    expect(mockClearHeartbeat).toHaveBeenCalled()
  })

  test('should remove all listeners on destroy', () => {
    const mockRemoveAllListeners = vi.spyOn(providerManager.provider as any, 'removeAllListeners')
    providerManager.destroy()
    expect(mockRemoveAllListeners).toHaveBeenCalled()
  })
})
