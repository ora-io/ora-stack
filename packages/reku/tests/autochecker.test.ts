import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Logger, setLogger } from '@ora-io/utils'
import { AutoCrossChecker } from '../src/event/crosschecker/autochecker'
import type { AutoCrossCheckParam, SimpleLog } from '../src/event/crosschecker/interface'

// Mock ethers provider
const mockProvider = {
  provider: {
    getBlock: vi.fn().mockResolvedValue({ number: 2000 }),
    getLogs: vi.fn().mockResolvedValue([]),
    getBlockNumber: vi.fn().mockResolvedValue(2000),
  },
}

// Mock logs for testing
const mockLogs: any[] = [
  {
    transactionHash: '0x1234567890abcdef',
    index: 0,
    blockNumber: 1000,
    blockHash: '0xblockhash1',
    address: '0xcontract1',
    topics: ['0xtopic1'],
    data: '0xdata1',
    removed: false,
    transactionIndex: 0,
  },
  {
    transactionHash: '0xabcdef1234567890',
    index: 1,
    blockNumber: 1000,
    blockHash: '0xblockhash1',
    address: '0xcontract1',
    topics: ['0xtopic1'],
    data: '0xdata2',
    removed: false,
    transactionIndex: 0,
  },
]

setLogger(new Logger('debug', 'reku-autochecker-tests'))

describe('AutoCrossChecker', () => {
  let autoChecker: AutoCrossChecker
  let onMissingLogSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    autoChecker = new AutoCrossChecker(mockProvider as any)
    onMissingLogSpy = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with provider', () => {
      expect(autoChecker).toBeInstanceOf(AutoCrossChecker)
      expect(autoChecker.provider).toBe(mockProvider)
      expect(autoChecker.cache).toBeUndefined()
      expect(autoChecker.checkpointBlockNumber).toBeUndefined()
      expect(autoChecker.playing).toBe(false)
    })
  })

  describe('validate', () => {
    it('should validate valid options', () => {
      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        toBlock: 2000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).not.toThrow()
    })

    it('should throw error when batchBlocksCount is 0', () => {
      const options: AutoCrossCheckParam = {
        batchBlocksCount: 0,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).toThrow('options invalid: should batchBlocksCount >= 1')
    })

    it('should throw error when batchBlocksCount is negative', () => {
      const options: AutoCrossCheckParam = {
        batchBlocksCount: -1,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).toThrow('options invalid: should batchBlocksCount >= 1')
    })

    it('should throw error when toBlock is provided without fromBlock', () => {
      const options: AutoCrossCheckParam = {
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).toThrow('options invalid: need fromBlock when toBlock presents')
    })

    it('should throw error when toBlock is less than fromBlock', () => {
      const options: AutoCrossCheckParam = {
        fromBlock: 2000,
        toBlock: 1000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).toThrow('options invalid: should fromBlock <= toBlock')
    })

    it('should throw error when pollingInterval is too high in realtime mode', () => {
      const options: AutoCrossCheckParam = {
        batchBlocksCount: 10,
        pollingInterval: 150000, // Higher than 10 * 12000 = 120000
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      expect(() => autoChecker.validate(options)).toThrow('options invalid: should pollingInterval <= batchBlocksCount * blockInterval when no toBlock present')
    })
  })

  describe('setCheckpoint', () => {
    it('should set checkpoint and call cache.setCheckpoint', async () => {
      const checkpoint = 1500

      // Mock the cache property
      const mockCache = {
        setCheckpoint: vi.fn(),
      }
      Object.defineProperty(autoChecker, 'cache', {
        value: mockCache,
        writable: true,
      })

      await autoChecker.setCheckpoint(checkpoint)

      expect(autoChecker.checkpointBlockNumber).toBe(checkpoint)
      expect(mockCache.setCheckpoint).toHaveBeenCalledWith(checkpoint)
    })
  })

  describe('start', () => {
    it('should start with valid options and create cache manager', async () => {
      mockProvider.provider.getBlockNumber.mockResolvedValue(2000)

      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        toBlock: 2000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      // Mock the polling function to return immediately
      const mockPolling = vi.fn().mockResolvedValue(true)
      vi.doMock('@ora-io/utils', () => ({
        ...vi.importActual('@ora-io/utils'),
        polling: mockPolling,
      }))

      await autoChecker.start(options)

      expect(autoChecker.cache).toBeDefined()
      expect(autoChecker.checkpointBlockNumber).toBe(1000)
      expect(autoChecker.playing).toBe(true)
    })

    it('should handle provider not ready error', async () => {
      mockProvider.provider.getBlockNumber.mockRejectedValue(new Error('provider not ready'))

      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        toBlock: 2000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await expect(autoChecker.start(options)).rejects.toThrow('provider not ready')
    })

    it('should use default values when options are not provided', async () => {
      mockProvider.provider.getBlockNumber.mockResolvedValue(2000)

      const options: AutoCrossCheckParam = {
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      // Mock the polling function to return immediately
      const mockPolling = vi.fn().mockResolvedValue(true)
      vi.doMock('@ora-io/utils', () => ({
        ...vi.importActual('@ora-io/utils'),
        polling: mockPolling,
      }))

      await autoChecker.start(options)

      expect(autoChecker.checkpointBlockNumber).toBe(2000) // Should use latest block number
    })

    it('should handle autoFollowLatestBlock option', async () => {
      mockProvider.provider.getBlockNumber.mockResolvedValue(2000)

      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        autoFollowLatestBlock: true,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      // Mock the polling function to return immediately
      const mockPolling = vi.fn().mockResolvedValue(true)
      vi.doMock('@ora-io/utils', () => ({
        ...vi.importActual('@ora-io/utils'),
        polling: mockPolling,
      }))

      await autoChecker.start(options)

      expect(autoChecker.playing).toBe(true)
    })
  })

  describe('stop', () => {
    it('should set playing to false', () => {
      autoChecker.playing = true

      autoChecker.stop()

      expect(autoChecker.playing).toBe(false)
    })
  })

  describe('diff', () => {
    it('should call parent diff method and filter based on cache', async () => {
      // Mock the cache property
      const mockCache = {
        encodeLogKey: vi.fn().mockReturnValue('log-key-1'),
        has: vi.fn().mockResolvedValue(false),
      }
      Object.defineProperty(autoChecker, 'cache', {
        value: mockCache,
        writable: true,
      })

      const ignoreLogs: SimpleLog[] = [
        { transactionHash: '0x1234567890abcdef', index: 0 },
      ]

      const result = await autoChecker.diff(mockLogs, ignoreLogs)

      expect(mockCache.encodeLogKey).toHaveBeenCalledWith(mockLogs[1])
      expect(mockCache.has).toHaveBeenCalledWith('log-key-1')
      expect(result).toHaveLength(1)
    })
  })

  describe('integration tests', () => {
    it('should handle complete start and stop cycle', async () => {
      mockProvider.provider.getBlockNumber.mockResolvedValue(2000)

      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        toBlock: 2000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      // Mock the polling function to return immediately
      const mockPolling = vi.fn().mockResolvedValue(true)
      vi.doMock('@ora-io/utils', () => ({
        ...vi.importActual('@ora-io/utils'),
        polling: mockPolling,
      }))

      await autoChecker.start(options)
      expect(autoChecker.playing).toBe(true)

      autoChecker.stop()
      expect(autoChecker.playing).toBe(false)
    })

    it('should handle onMissingLog callback with cache update', async () => {
      mockProvider.provider.getBlockNumber.mockResolvedValue(2000)

      const options: AutoCrossCheckParam = {
        fromBlock: 1000,
        toBlock: 2000,
        batchBlocksCount: 10,
        pollingInterval: 3000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      // Mock the polling function to return immediately
      const mockPolling = vi.fn().mockResolvedValue(true)
      vi.doMock('@ora-io/utils', () => ({
        ...vi.importActual('@ora-io/utils'),
        polling: mockPolling,
      }))

      await autoChecker.start(options)

      // Simulate a missing log callback
      const log = mockLogs[0]
      await options.onMissingLog(log)

      expect(onMissingLogSpy).toHaveBeenCalledWith(log)
    })
  })
})
