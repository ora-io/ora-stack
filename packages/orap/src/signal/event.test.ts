import { ethers } from 'ethers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AutoCrossCheckParam } from '@ora-io/reku'
import { AutoCrossChecker, RekuProviderManager } from '@ora-io/reku'
import type { ContractAddress } from '@ora-io/utils/src'
import { ERC20_ABI, MAINNET_WSS, USDT_ADDRESS } from '../../tests/config'
import type { EventSignalCallback, EventSignalRegisterParams } from './event'
import { EventSignal } from './event'

describe('EventSignal', () => {
  let eventSignal: EventSignal
  let rekuProviderManager: RekuProviderManager
  const params: EventSignalRegisterParams = {
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    eventName: 'Transfer',
  }
  const callback: EventSignalCallback = vi.fn()

  beforeEach(() => {
    eventSignal = new EventSignal(params, callback)
    rekuProviderManager = new RekuProviderManager(MAINNET_WSS)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create an instance of EventSignal', () => {
      expect(eventSignal).toBeInstanceOf(EventSignal)
    })

    it('should set the eventFragment property', () => {
      expect(eventSignal.eventFragment).toBeInstanceOf(ethers.EventFragment)
      expect(eventSignal.eventFragment.name).toBe(params.eventName)
    })

    it('should set the esig property', () => {
      expect(eventSignal.esig).toBe(eventSignal.eventFragment.topicHash)
    })

    it('should set the subscribeCallback property', () => {
      expect(eventSignal.subscribeCallback).toBeInstanceOf(Function)
    })

    it('should set the crosscheckCallback property', () => {
      expect(eventSignal.crosscheckCallback).toBeInstanceOf(Function)
    })

    it('should set the crosscheckerOptions property', () => {
      expect(eventSignal.crosscheckerOptions).toBeUndefined()
    })
  })

  describe('listen', () => {
    const provider = {} as any
    const crosscheckProvider = {} as any

    beforeEach(() => {
      eventSignal.startEventListener = vi.fn()
      eventSignal.startCrossChecker = vi.fn()
    })

    it('should set the provider property', () => {
      eventSignal.listen(provider, crosscheckProvider)
      expect(eventSignal.provider).toBe(provider)
    })

    it('should call startEventListener', () => {
      eventSignal.listen(provider, crosscheckProvider)
      expect(eventSignal.startEventListener).toHaveBeenCalledWith(provider)
    })

    it('should call startCrossChecker', () => {
      eventSignal.listen(provider, crosscheckProvider)
      expect(eventSignal.startCrossChecker).toHaveBeenCalledWith(crosscheckProvider)
    })

    it('should return the EventSignal instance', () => {
      const result = eventSignal.listen(provider, crosscheckProvider)
      expect(result).toBe(eventSignal)
    })
  })

  describe('startEventListener', () => {
    const provider = {} as any

    beforeEach(() => {
      // Mock the contract in the contractMap
      const mockContract = {
        connect: vi.fn().mockReturnValue({
          on: vi.fn(),
        }),
        removeListener: vi.fn(),
      } as any
      eventSignal.contractMap.set(params.address as ContractAddress, mockContract)
    })

    it('should add the contract to the provider if provider is an instance of RekuProviderManager', () => {
      rekuProviderManager.addContract = vi.fn()
      rekuProviderManager.addListener = vi.fn()
      eventSignal.startEventListener(rekuProviderManager)
      expect(rekuProviderManager.addContract).toHaveBeenCalledWith(params.address, eventSignal.contractMap.get(params.address as ContractAddress))
      expect(rekuProviderManager.addListener).toHaveBeenCalledWith(params.address, params.eventName, eventSignal.subscribeCallback)
    })

    it('should call the on method of the listener with the eventName and subscribeCallback', () => {
      const listener = {
        on: vi.fn(),
      }
      const mockContract = eventSignal.contractMap.get(params.address as ContractAddress)
      if (mockContract)
        mockContract.connect = vi.fn().mockReturnValue(listener)

      eventSignal.startEventListener(provider)
      expect(listener.on).toHaveBeenCalledWith(params.eventName, eventSignal.subscribeCallback)
    })
  })

  describe('startCrossChecker', () => {
    const provider = {} as any

    beforeEach(() => {
      eventSignal.crosscheckerOptions = {
        pollingInterval: 60000,
        ignoreLogs: [],
      } as unknown as AutoCrossCheckParam
    })

    afterEach(() => {
    })

    it('should throw an error if crosscheckerOptions is not set', async () => {
      eventSignal.crosscheckerOptions = undefined
      expect(await eventSignal.startCrossChecker(provider)).toBeUndefined()
    })

    it('should throw an error if provider is not provided', async () => {
      await expect(eventSignal.startCrossChecker()).rejects.toThrow('crosscheckProvider is required in listen() when crosschecker is set')
    })

    it('should throw an error if provider is not a correct value', async () => {
      await expect(eventSignal.startCrossChecker(provider)).rejects.toThrow('crosscheckProvider must be an instance of RekuProviderManager or ethers.JsonRpcProvider or ethers.WebSocketProvider')
    })

    it('should create a new AutoCrossChecker instance', async () => {
      eventSignal.startCrossChecker(new ethers.WebSocketProvider(MAINNET_WSS))
      expect(eventSignal.crosschecker).toBeInstanceOf(AutoCrossChecker)
    })

    it('should start the crosschecker with the crosscheckerOptions', async () => {
      vi.spyOn(AutoCrossChecker.prototype, 'start')
      eventSignal.startCrossChecker(new ethers.WebSocketProvider(MAINNET_WSS))
      expect(eventSignal.crosschecker?.start).toHaveBeenCalledWith(eventSignal.crosscheckerOptions)
    })
  })

  describe('stop', () => {
    it('should stop the event listener and the crosschecker', () => {
      eventSignal.stopEventListener = vi.fn()
      eventSignal.stopCrossChecker = vi.fn()
      eventSignal.stop()
      expect(eventSignal.stopEventListener).toHaveBeenCalled()
      expect(eventSignal.stopCrossChecker).toHaveBeenCalledWith()
    })
  })
})
