import { beforeEach, describe, expect, it } from 'vitest'
import { TaskBase } from '../task/base'

describe('TaskBase', () => {
  let task: TaskBase

  beforeEach(() => {
    task = new TaskBaseImpl()
  })

  it('should convert to key', async () => {
    const key = await task.toKey()
    expect(typeof key).toBe('string')
  })

  it('should convert to string', () => {
    const jsonString = task.toString()
    expect(typeof jsonString).toBe('string')
  })

  it('should convert from string', () => {
    const jsonString = '{"key":"value"}'
    const newTask = TaskBaseImpl.fromString(jsonString)
    expect(newTask).toBeInstanceOf(TaskBaseImpl)
    expect(newTask.toString()).toBe(jsonString)
  })
})

class TaskBaseImpl extends TaskBase {
  async toKey(): Promise<string> {
    return 'test-key'
  }
}
