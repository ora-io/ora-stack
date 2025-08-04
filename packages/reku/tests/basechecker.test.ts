import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Logger, setLogger } from '@ora-io/utils'
import { BaseCrossChecker } from '../src/event/crosschecker/basechecker'
import type { CrossCheckFromParam, CrossCheckRangeParam, CrossCheckRetroParam, SimpleLog } from '../src/event/crosschecker/interface'

// Mock ethers provider
const mockProvider = {
  provider: {
    getBlock: vi.fn(),
    getLogs: vi.fn(),
    provider: {
      getBlock: vi.fn(),
      getLogs: vi.fn(),
    },
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
  {
    transactionHash: '0x9876543210fedcba',
    index: 2,
    blockNumber: 1001,
    blockHash: '0xblockhash2',
    address: '0xcontract1',
    topics: ['0xtopic1'],
    data: '0xdata3',
    removed: false,
    transactionIndex: 0,
  },
]

// Mock block for testing
const mockBlock = {
  number: 2000,
  hash: '0xlatestblockhash',
  timestamp: Date.now(),
}

setLogger(new Logger('debug', 'reku-basechecker-tests'))

describe('BaseCrossChecker', () => {
  let baseChecker: BaseCrossChecker
  let onMissingLogSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    baseChecker = new BaseCrossChecker(mockProvider as any)
    onMissingLogSpy = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with provider', () => {
      expect(baseChecker).toBeInstanceOf(BaseCrossChecker)
      expect(baseChecker.provider).toBe(mockProvider)
    })
  })

  describe('crossCheckRange', () => {
    it('should call _crossCheck with correct parameters', async () => {
      const spy = vi.spyOn(baseChecker as any, '_crossCheck').mockResolvedValue(undefined)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckRange(options)

      expect(spy).toHaveBeenCalledWith(options)
    })
  })

  describe('crossCheckRetro', () => {
    it('should get latest block and call _crossCheck with correct range', async () => {
      const spy = vi.spyOn(baseChecker as any, '_crossCheck').mockResolvedValue(undefined)
      mockProvider.provider.getBlock.mockResolvedValue(mockBlock)

      const options: CrossCheckRetroParam = {
        retroBlockCount: 100,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckRetro(options)

      expect(mockProvider.provider.getBlock).toHaveBeenCalledWith('latest')
      expect(spy).toHaveBeenCalledWith({
        ...options,
        fromBlock: mockBlock.number - options.retroBlockCount,
        toBlock: mockBlock.number,
      })
    })

    it('should warn when retroBlockCount is too low', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockProvider.provider.getBlock.mockResolvedValue(mockBlock)
      vi.spyOn(baseChecker as any, '_crossCheck').mockResolvedValue(undefined)

      const options: CrossCheckRetroParam = {
        retroBlockCount: 100, // Less than ETH_BLOCK_COUNT_ONE_HOUR
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckRetro(options)

      expect(consoleSpy).toHaveBeenCalledWith(
        'crosscheck retroBlockCount too low, recommend block range >= 1 hour',
      )
      consoleSpy.mockRestore()
    })

    it('should handle provider not ready error', async () => {
      mockProvider.provider.getBlock.mockRejectedValue(new Error('provider not ready'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const options: CrossCheckRetroParam = {
        retroBlockCount: 100,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckRetro(options)

      expect(consoleSpy).toHaveBeenCalledWith(
        'crosscheck failed to get latest block',
        new Error('provider not ready'),
      )
      consoleSpy.mockRestore()
    })

    it('should handle null block response', async () => {
      // Reset mock before setting up the null response
      vi.clearAllMocks()
      mockProvider.provider.getBlock.mockResolvedValue(null)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const options: CrossCheckRetroParam = {
        retroBlockCount: 100,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckRetro(options)

      expect(consoleSpy).toHaveBeenCalledWith('crosscheck failed to get latest block')
      consoleSpy.mockRestore()
    })
  })

  describe('crossCheckFrom', () => {
    it('should get latest block and call _crossCheck with correct range', async () => {
      const spy = vi.spyOn(baseChecker as any, '_crossCheck').mockResolvedValue(undefined)
      mockProvider.provider.getBlock.mockResolvedValue(mockBlock)

      const options: CrossCheckFromParam = {
        fromBlock: 1000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      const result = await baseChecker.crossCheckFrom(options)

      expect(mockProvider.provider.getBlock).toHaveBeenCalledWith('latest')
      expect(spy).toHaveBeenCalledWith({
        ...options,
        fromBlock: options.fromBlock,
        toBlock: mockBlock.number,
      })
      expect(result).toBe(mockBlock.number)
    })

    it('should warn when block range is too small', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockProvider.provider.getBlock.mockResolvedValue(mockBlock)
      vi.spyOn(baseChecker as any, '_crossCheck').mockResolvedValue(undefined)

      const options: CrossCheckFromParam = {
        fromBlock: 1999, // Very close to latest block
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await baseChecker.crossCheckFrom(options)

      expect(consoleSpy).toHaveBeenCalledWith(
        'crosscheck retroBlockCount too low, recommend crosscheck interval >= 1 hour',
      )
      consoleSpy.mockRestore()
    })

    it('should handle provider not ready error', async () => {
      mockProvider.provider.getBlock.mockRejectedValue(new Error('provider not ready'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const options: CrossCheckFromParam = {
        fromBlock: 1000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      const result = await baseChecker.crossCheckFrom(options)

      expect(consoleSpy).toHaveBeenCalledWith(
        'crosscheck failed to get latest block',
        new Error('provider not ready'),
      )
      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })
  })

  describe('diff', () => {
    it('should return logs that are not in ignoreLogs', async () => {
      const ignoreLogs: SimpleLog[] = [
        { transactionHash: '0x1234567890abcdef', index: 0 },
        { transactionHash: '0xabcdef1234567890', index: 1 },
      ]

      const result = await baseChecker.diff(mockLogs, ignoreLogs)

      expect(result).toHaveLength(1)
      expect(result[0].transactionHash).toBe('0x9876543210fedcba')
    })

    it('should return all logs when ignoreLogs is empty', async () => {
      const result = await baseChecker.diff(mockLogs, [])

      expect(result).toHaveLength(3)
      expect(result).toEqual(mockLogs)
    })

    it('should handle logs without index in ignoreLogs', async () => {
      const ignoreLogs: SimpleLog[] = [
        { transactionHash: '0x1234567890abcdef' }, // No index specified
      ]

      const result = await baseChecker.diff(mockLogs, ignoreLogs)

      expect(result).toHaveLength(2)
      expect(result[0].transactionHash).toBe('0xabcdef1234567890')
      expect(result[1].transactionHash).toBe('0x9876543210fedcba')
    })

    it('should return empty array when all logs are ignored', async () => {
      const ignoreLogs: SimpleLog[] = [
        { transactionHash: '0x1234567890abcdef', index: 0 },
        { transactionHash: '0xabcdef1234567890', index: 1 },
        { transactionHash: '0x9876543210fedcba', index: 2 },
      ]

      const result = await baseChecker.diff(mockLogs, ignoreLogs)

      expect(result).toHaveLength(0)
    })
  })

  describe('_crossCheck', () => {
    it('should get logs and call onMissingLog for missing logs', async () => {
      mockProvider.provider.getLogs.mockResolvedValue(mockLogs)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
        ignoreLogs: [
          { transactionHash: '0x1234567890abcdef', index: 0 },
        ],
      }

      await (baseChecker as any)._crossCheck(options)

      expect(mockProvider.provider.getLogs).toHaveBeenCalledWith({
        fromBlock: 1000,
        toBlock: 2000,
        address: ['0xcontract1'],
        topics: ['0xtopic1'],
      })
      expect(onMissingLogSpy).toHaveBeenCalledTimes(2)
    })

    it('should handle provider not ready error', async () => {
      mockProvider.provider.getLogs.mockRejectedValue(new Error('provider not ready'))

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: ['0xcontract1'],
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await expect((baseChecker as any)._crossCheck(options)).rejects.toThrow('provider not ready')
    })

    it('should handle missing address and topics', async () => {
      mockProvider.provider.getLogs.mockResolvedValue(mockLogs)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await (baseChecker as any)._crossCheck(options)

      expect(mockProvider.provider.getLogs).toHaveBeenCalledWith({
        fromBlock: 1000,
        toBlock: 2000,
        address: ['0xcontract1'],
        topics: ['0xtopic1'],
      })
    })

    it('should call onMissingLog for all logs when no ignoreLogs provided', async () => {
      mockProvider.provider.getLogs.mockResolvedValue(mockLogs)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
      }

      await (baseChecker as any)._crossCheck(options)

      expect(onMissingLogSpy).toHaveBeenCalledTimes(3)
    })

    it('should handle addressGroupLimit', async () => {
      mockProvider.provider.getLogs.mockResolvedValue(mockLogs)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: ['0xcontract1', '0xcontract2'],
        addressGroupLimit: 1,
        onMissingLog: onMissingLogSpy,
        topics: [],
      }

      await (baseChecker as any)._crossCheck(options)

      expect(mockProvider.provider.getLogs).toHaveBeenCalledTimes(2)
    })

    it('should handle addressGroupLimit with single address', async () => {
      mockProvider.provider.getLogs.mockResolvedValue(mockLogs)

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        addressGroupLimit: 1,
        onMissingLog: onMissingLogSpy,
        topics: [],
      }

      await (baseChecker as any)._crossCheck(options)

      expect(mockProvider.provider.getLogs).toHaveBeenCalledTimes(1)

      expect(mockProvider.provider.getLogs).toHaveBeenCalledWith({
        fromBlock: 1000,
        toBlock: 2000,
        address: ['0xcontract1'],
        topics: [],
      })
    })

    it('should handle retryOptions', async () => {
      mockProvider.provider.getLogs.mockRejectedValue(Error('provider not ready'))

      const options: CrossCheckRangeParam = {
        fromBlock: 1000,
        toBlock: 2000,
        address: '0xcontract1',
        topics: ['0xtopic1'],
        onMissingLog: onMissingLogSpy,
        retryOptions: {
          timeout: 1000,
          retries: 1,
        },
      }

      const defaultCallTimes = 1

      try {
        await (baseChecker as any)._crossCheck(options)
      }
      catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('provider not ready')
      }

      expect(mockProvider.provider.getLogs).toHaveBeenCalledTimes(defaultCallTimes + options.retryOptions!.retries!)
      expect(onMissingLogSpy).toHaveBeenCalledTimes(0)
    })
  })
})
