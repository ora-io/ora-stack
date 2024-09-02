import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Awaitable } from '@ora-io/utils/dist'
import type { StoreManager } from '../store'
import { TaskStorable } from './storable'
import type { Context } from './context'

class MockTaskStorable extends TaskStorable {
  toKey(): Awaitable<string> {
    return 'taskKey'
  }

  static readonly taskPrefix = 'Task:'
  static readonly taskPrefixDone = 'Done-Task:'
  static readonly taskTtl = 1000
  static readonly taskTtlDone = 1000
}

describe('TaskStorable', () => {
  let taskStorable: TaskStorable

  beforeEach(() => {
    taskStorable = new MockTaskStorable()
  })

  it('should get task prefix', async () => {
    const context = {} as unknown as Context
    const prefix = await taskStorable.getTaskPrefix(context)

    expect(prefix).toBe(MockTaskStorable.taskPrefix)
  })

  it('should get task prefix done', async () => {
    const context = {} as unknown as Context
    const prefix = await taskStorable.getTaskPrefixDone(context)

    expect(prefix).toBe(MockTaskStorable.taskPrefixDone)
  })

  it('should get task ttl', async () => {
    const ttl = taskStorable.getTaskTtl()

    expect(ttl).toBe(MockTaskStorable.taskTtl)
    expect(taskStorable.taskTtl).toBe(MockTaskStorable.taskTtl)
  })

  it('should get task ttl done', async () => {
    const ttl = taskStorable.getTaskTtlDone()

    expect(ttl).toBe(MockTaskStorable.taskTtlDone)
    expect(taskStorable.taskTtlDone).toBe(MockTaskStorable.taskTtlDone)
  })

  it('should save task', async () => {
    const sm = { set: vi.fn() } as unknown as StoreManager
    const context = {} as unknown as Context
    const key = `${MockTaskStorable.taskPrefix}${await taskStorable.toKey()}`

    await taskStorable.save(sm, context)
    expect(sm.set).toHaveBeenCalledWith(key, '{}', MockTaskStorable.taskTtl)
  })

  it('should remove task', async () => {
    const sm = { del: vi.fn() } as unknown as StoreManager
    const context = {} as unknown as Context
    const key = `${MockTaskStorable.taskPrefix}${await taskStorable.toKey()}`

    await taskStorable.remove(sm, context)

    expect(sm.del).toHaveBeenCalledWith(key)
  })

  it('should mark task as done', async () => {
    const sm = { set: vi.fn() } as unknown as StoreManager
    const context = {} as unknown as Context
    const key = `${MockTaskStorable.taskPrefixDone}${await taskStorable.toKey()}`

    await taskStorable.done(sm, context)

    expect(sm.set).toHaveBeenCalledWith(key, '{}', MockTaskStorable.taskTtlDone)
  })

  it('should load task', async () => {
    const sm = { keys: vi.fn().mockResolvedValue(['key']), get: vi.fn().mockResolvedValue('{}') } as unknown as StoreManager
    const context = {} as unknown as Context

    const task = await MockTaskStorable.load(sm, context)

    expect(task).toBeInstanceOf(MockTaskStorable)
    expect(sm.keys).toHaveBeenCalledWith(`${MockTaskStorable.taskPrefix}*`, true)
    expect(sm.get).toHaveBeenCalledWith('key')
  })
})
