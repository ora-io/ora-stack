import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '@ora-io/utils'
import { EventFlow, OrapFlow, TaskFlow } from '../flow'
import type { StoreManager } from '../store'
import { getMiddlewareContext } from '../utils'
import { HandleFailedMiddleware, HandleSuccessMiddleware } from '../middlewares/private'
import { TaskRaplized } from './verse'

describe('TaskRaplized', () => {
  let taskFlow: TaskFlow
  let taskRaplized: TaskRaplized
  const taskFlowTaskPrefix = 'taskPrefix:'
  const taskFlowDonePrefix = 'donePrefix:'
  const taskFlowTaskTtl = 1000
  const taskFlowDoneTtl = 2000

  beforeEach(() => {
    taskFlow = new TaskFlow(new EventFlow(new OrapFlow()))
    taskFlow.handle(vi.fn(async (...args: any[]) => {
      const { next } = getMiddlewareContext(args)

      await next()
    }))
    taskFlow.taskPrefix = taskFlowTaskPrefix
    taskFlow.donePrefix = taskFlowDonePrefix
    taskFlow.taskTtl = taskFlowTaskTtl
    taskFlow.doneTtl = taskFlowDoneTtl
    taskRaplized = new TaskRaplized(taskFlow)
  })

  it('should get the task prefix', async () => {
    const taskPrefix = 'taskPrefix'
    taskFlow.taskPrefix = taskPrefix
    const result = await taskRaplized.getTaskPrefix()
    expect(result).toEqual(taskPrefix)
  })

  it('should get the task prefix done', async () => {
    const donePrefix = 'donePrefix'
    taskFlow.donePrefix = donePrefix
    const result = await taskRaplized.getTaskPrefixDone()
    expect(result).toEqual(donePrefix)
  })

  it('should get the task TTL', () => {
    const taskTtl = 1000
    taskFlow.taskTtl = taskTtl
    const result = taskRaplized.taskTtl
    expect(result).toEqual(taskTtl)
  })

  it('should get the task TTL done', () => {
    const doneTtl = 2000
    taskFlow.doneTtl = doneTtl
    const result = taskRaplized.taskTtlDone
    expect(result).toEqual(doneTtl)
  })

  it('should generate a task key', async () => {
    const eventLog = [1, 2, 3]
    taskFlow.toKeyFn = vi.fn().mockResolvedValue('taskKey')
    taskRaplized.eventLog = eventLog
    const result = await taskRaplized.toKey()
    expect(result).toEqual('taskKey')
    expect(taskFlow.toKeyFn).toHaveBeenCalledWith(...eventLog)
  })

  it('should handle the task successfully', async () => {
    const eventLog = [1, 2, 3]
    const handle = vi.fn(async (...args: any[]) => {
      const { next } = getMiddlewareContext(args)
      await next()
      return true
    })
    taskFlow.handle(handle).use(HandleSuccessMiddleware)
    taskFlow.successFn = vi.fn()
    taskRaplized.eventLog = eventLog
    await taskRaplized.handle()
    await sleep(0)
    expect(taskFlow.handleFn).toHaveBeenCalledWith(...eventLog, taskRaplized, expect.any(Function))
    expect(taskFlow.successFn).toHaveBeenCalledWith(taskRaplized)
  })

  it('should handle the task as a failure', async () => {
    const eventLog = [1, 2, 3]
    const handle = vi.fn(async () => {
      throw new Error('error')
    })
    taskFlow.use(HandleFailedMiddleware).handle(handle)
    taskFlow.failFn = vi.fn()
    taskRaplized.eventLog = eventLog
    await taskRaplized.handle()
    await sleep(0)
    expect(taskFlow.handleFn).toHaveBeenCalledWith(...eventLog, taskRaplized, expect.any(Function))
    expect(taskFlow.failFn).toHaveBeenCalledWith(taskRaplized)
  })

  it('should save the task', async () => {
    const sm = {
      get: vi.fn().mockResolvedValue('serializedTask'),
      set: vi.fn(),
    } as unknown as StoreManager

    taskFlow.sm = sm
    taskRaplized.toString = vi.fn().mockReturnValue('serializedTask')
    taskRaplized.fromString = vi.fn()
    taskRaplized.toKey = vi.fn().mockResolvedValue('taskKey')
    await taskRaplized.save()
    expect(taskFlow.sm.set).toHaveBeenCalledWith(`${taskFlowTaskPrefix}taskKey`, 'serializedTask', taskFlowTaskTtl)
    expect(taskRaplized.toString).toHaveBeenCalled()
  })

  it('should load the task', async () => {
    const taskKey = 'taskKey'
    const prefix = 'taskPrefix'
    const serializedTask = '[{"test": "test"}]'
    const sm = {
      keys: vi.fn().mockResolvedValue([`${prefix}${taskKey}`]),
      get: vi.fn().mockResolvedValue(serializedTask),
      del: vi.fn(),
    } as unknown as StoreManager

    taskFlow.sm = sm
    taskRaplized.getTaskPrefix = vi.fn().mockResolvedValue(prefix)
    taskRaplized.fromString = vi.fn().mockImplementationOnce(taskRaplized.fromString)
    await taskRaplized.load()
    expect(taskFlow.sm.keys).toHaveBeenCalledWith(`${prefix}*`, true)
    expect(taskFlow.sm.get).toHaveBeenCalledWith(`${prefix}${taskKey}`)
    expect(taskRaplized.fromString).toHaveBeenCalledWith(serializedTask)
  })

  it('should mark the task as done', async () => {
    const sm = {
      set: vi.fn(),
    } as unknown as StoreManager

    taskFlow.sm = sm
    taskRaplized.getTaskPrefixDone = vi.fn().mockResolvedValue('donePrefix')
    taskRaplized.toString = vi.fn().mockReturnValue('serializedTask')
    taskRaplized.toKey = vi.fn().mockResolvedValue('taskKey')
    await taskRaplized.done()
    expect(taskRaplized.getTaskPrefixDone).toHaveBeenCalled()
    expect(taskRaplized.toString).toHaveBeenCalled()
    expect(taskFlow.sm.set).toHaveBeenCalledWith('donePrefixtaskKey', 'serializedTask', taskFlowDoneTtl)
  })

  it('should remove the task', async () => {
    const sm = {
      del: vi.fn(),
    } as unknown as StoreManager
    taskFlow.sm = sm
    taskRaplized.getTaskPrefix = vi.fn().mockResolvedValue('rmPrefix')
    taskRaplized.toKey = vi.fn().mockResolvedValue('taskKey')
    await taskRaplized.remove()
    expect(taskRaplized.getTaskPrefix).toHaveBeenCalled()
    expect(taskRaplized.toKey).toHaveBeenCalled()
    expect(taskFlow.sm.del).toHaveBeenCalledWith('rmPrefixtaskKey')
  })

  it('should convert the task to a string', () => {
    const eventLog = [1, 2, 3]
    taskRaplized.eventLog = eventLog
    const result = taskRaplized.toString()
    expect(result).toEqual(JSON.stringify(eventLog))
  })

  it('should convert the task from a string', () => {
    const jsonString = '[1,2,3]'
    const result = taskRaplized.fromString(jsonString)
    expect(result).toEqual(taskRaplized)
    expect(taskRaplized.eventLog).toEqual(JSON.parse(jsonString))
  })
})
