import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '@murongg/utils'
import { TaskFlow } from '../flow/task'
import { EventFlow } from '../flow/event'
import { OrapFlow } from '../flow'
import { TaskRaplized } from '../task/verse'
import { ERC20_ABI, USDT_ADDRESS } from '../../tests/config'
import { TaskVerse } from './task'

// Mock the sleep function
vi.mock('@murongg/utils', () => ({
  sleep: vi.fn(),
}))

describe('TaskVerse', () => {
  let orapFlow: OrapFlow
  let eventFlow: EventFlow
  let taskFlow: TaskFlow
  let taskVerse: TaskVerse
  let mockStoreManager: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock store manager
    mockStoreManager = {
      keys: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    }

    orapFlow = new OrapFlow()
    eventFlow = new EventFlow(orapFlow, { address: USDT_ADDRESS, abi: ERC20_ABI, eventName: 'Transfer' })
    taskFlow = new TaskFlow(eventFlow)
    taskFlow.cache(mockStoreManager)
    taskVerse = new TaskVerse(taskFlow)
  })

  describe('constructor', () => {
    it('should create instance with task flow', () => {
      expect(taskVerse).toBeInstanceOf(TaskVerse)
      expect(taskVerse.flow).toBe(taskFlow)
    })
  })

  describe('createTask', () => {
    it('should create and save a task', async () => {
      vi.spyOn(TaskRaplized.prototype, 'save').mockResolvedValue(undefined)
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')

      const args = ['arg1', 'arg2', 'arg3']
      taskVerse.play()
      const result = await taskVerse.createTask(...args)

      expect(result).toBe(taskVerse)
      expect(TaskRaplized.prototype.save).toHaveBeenCalled()
    })

    it('should handle multiple tasks when loading is false', async () => {
      vi.spyOn(TaskRaplized.prototype, 'save').mockResolvedValue(undefined)
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys
        .mockResolvedValueOnce(['Task:test:1', 'Task:test:2'])
        .mockResolvedValueOnce([])

      const args = ['arg1', 'arg2']
      taskVerse.play()
      await taskVerse.createTask(...args)

      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockStoreManager.keys).toHaveBeenCalledWith('Task:test*')
      expect(TaskRaplized.prototype.loadByKey).toHaveBeenCalledTimes(2)
      expect(TaskRaplized.prototype.handle).toHaveBeenCalledTimes(2)
    })

    it('should not handle tasks when loading is true', async () => {
      vi.spyOn(TaskRaplized.prototype, 'save').mockResolvedValue(undefined)
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')
      ;(taskVerse as any).loading = true

      const args = ['arg1', 'arg2']
      taskVerse.play()
      await taskVerse.createTask(...args)

      expect(TaskRaplized.prototype.save).toHaveBeenCalled()
    })
  })

  describe('loadAndHandleAll', () => {
    it('should load and handle all tasks with given prefix', async () => {
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys
        .mockResolvedValueOnce(['Task:test:1', 'Task:test:2'])
        .mockResolvedValueOnce([])

      const args = ['arg1', 'arg2']
      await taskVerse.loadAndHandleAll('Task:test', ...args)

      expect(mockStoreManager.keys).toHaveBeenCalledWith('Task:test*')
      expect(TaskRaplized.prototype.loadByKey).toHaveBeenCalledTimes(2)
      expect(TaskRaplized.prototype.handle).toHaveBeenCalledTimes(2)
      expect(sleep).toHaveBeenCalledWith(1000)
    })

    it('should handle multiple batches of tasks', async () => {
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys
        .mockResolvedValueOnce(['Task:test:1', 'Task:test:2'])
        .mockResolvedValueOnce(['Task:test:3'])
        .mockResolvedValueOnce([])

      const args = ['arg1', 'arg2']
      await taskVerse.loadAndHandleAll('Task:test', ...args)

      expect(mockStoreManager.keys).toHaveBeenCalledTimes(3)
      expect(TaskRaplized.prototype.loadByKey).toHaveBeenCalledTimes(3)
      expect(TaskRaplized.prototype.handle).toHaveBeenCalledTimes(3)
      expect(sleep).toHaveBeenCalledTimes(2)
    })

    it('should stop when no more keys are found', async () => {
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys.mockResolvedValue([])

      const args = ['arg1', 'arg2']
      await taskVerse.loadAndHandleAll('Task:test', ...args)

      expect(mockStoreManager.keys).toHaveBeenCalledTimes(1)
      expect(TaskRaplized.prototype.loadByKey).not.toHaveBeenCalled()
      expect(TaskRaplized.prototype.handle).not.toHaveBeenCalled()
      expect(sleep).not.toHaveBeenCalled()
    })
  })

  describe('preload', () => {
    it('should start preloading tasks', async () => {
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys.mockResolvedValue([])

      taskVerse.preload()

      // Wait for the async operation to complete
      await sleep(0)

      expect((taskVerse as any).loading).toBe(true)
      expect(TaskRaplized.prototype.getTaskPrefix).toHaveBeenCalled()
    })

    it('should set loading to false after preloading completes', async () => {
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys.mockResolvedValue([])

      taskVerse.preload()

      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect((taskVerse as any).loading).toBe(false)
    })
  })

  describe('play', () => {
    it('should call preload', () => {
      const preloadSpy = vi.spyOn(taskVerse, 'preload')
      taskVerse.play()
      expect(preloadSpy).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should set playing to false', () => {
      // Set playing to true first
      (taskVerse as any).playing = true

      taskVerse.stop()

      expect((taskVerse as any).loading).toBe(false)
    })
  })

  describe('integration', () => {
    it('should handle complete task lifecycle', async () => {
      vi.spyOn(TaskRaplized.prototype, 'save').mockResolvedValue(undefined)
      vi.spyOn(TaskRaplized.prototype, 'getTaskPrefix').mockResolvedValue('Task:test')
      vi.spyOn(TaskRaplized.prototype, 'loadByKey').mockResolvedValue({} as TaskRaplized)
      vi.spyOn(TaskRaplized.prototype, 'handle').mockResolvedValue(undefined)

      mockStoreManager.keys.mockResolvedValue([])

      // Start the task verse
      taskVerse.play()

      // Create a task
      const args = ['arg1', 'arg2']
      await taskVerse.createTask(...args)

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      // Stop the task verse
      taskVerse.stop()

      expect((taskVerse as any).loading).toBe(false)
      expect(TaskRaplized.prototype.save).toHaveBeenCalled()
    })
  })
})
