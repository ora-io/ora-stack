import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStore } from '@ora-io/utils'
import { StoreManager } from '../store'
import { EventFlow, TaskFlow } from '.'

describe('TaskFlow', () => {
  let parentFlow: any
  let taskFlow: TaskFlow

  beforeEach(() => {
    parentFlow = new EventFlow()
    taskFlow = new TaskFlow(parentFlow)
  })

  it('should set cache', () => {
    const sm = new StoreManager(memoryStore())
    const result = taskFlow.cache(sm)
    expect(result).toBe(taskFlow)
    expect(taskFlow.sm).toBe(sm)
  })

  it('should set context', () => {
    const ctx = { key: 'value' }
    const result = taskFlow.context(ctx)
    expect(result).toBe(taskFlow)
    expect(taskFlow.ctx).toBe(ctx)
  })

  it('should set prefix', () => {
    const taskPrefix = 'Task:'
    const donePrefix = 'Done-Task:'
    const result = taskFlow.prefix(taskPrefix, donePrefix)
    expect(result).toBe(taskFlow)
    expect(taskFlow.taskPrefix).toBe(taskPrefix)
    expect(taskFlow.donePrefix).toBe(donePrefix)
  })

  it('should set TTL', () => {
    const TTLs = { taskTtl: 1000, doneTtl: 2000 }
    const result = taskFlow.ttl(TTLs)
    expect(result).toBe(taskFlow)
    expect(taskFlow.taskTtl).toBe(TTLs.taskTtl)
    expect(taskFlow.doneTtl).toBe(TTLs.doneTtl)
  })

  it('should set key', () => {
    const toKey = () => 'key'
    const result = taskFlow.key(toKey)
    expect(result).toBe(taskFlow)
    expect(taskFlow.toKeyFn).toBe(toKey)
  })

  it('should set handle', () => {
    const handler = vi.fn()
    const result = taskFlow.handle(handler)
    expect(result).toBe(taskFlow)
    expect(taskFlow.handleFn).toBe(handler)
  })

  it('should set success', () => {
    const onSuccess = vi.fn()
    const result = taskFlow.success(onSuccess)
    expect(result).toBe(taskFlow)
    expect(taskFlow.successFn).toBe(onSuccess)
  })

  it('should set fail', () => {
    const onFail = vi.fn()
    const result = taskFlow.fail(onFail)
    expect(result).toBe(taskFlow)
    expect(taskFlow.failFn).toBe(onFail)
  })

  it('should get another EventFlow', () => {
    const result = taskFlow.another()
    expect(result).toBe(parentFlow)
  })

  it('should assemble the TaskVerse', () => {
    const taskVerse = taskFlow.assemble()
    expect(taskVerse).toBeDefined()
    expect(taskVerse.flow).toBe(taskFlow)
  })
})
