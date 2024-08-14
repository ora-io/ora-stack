import type { Constructor } from '@ora-io/utils'
import type { StoreManager } from '../store/storemanager'
import { TaskBase } from './base'

export abstract class TaskStorable extends TaskBase {
  // overwrite these for store key customize
  static readonly taskPrefix: string = 'Task:'
  static readonly taskPrefixDone: string = 'Done-Task:'
  static readonly taskTtl: number | undefined = undefined
  static readonly taskTtlDone: number | undefined = undefined

  getTaskPrefix<T extends TaskStorable>(_context?: Partial<T>): string {
    return (this.constructor as typeof TaskStorable).taskPrefix
  }

  getTaskPrefixDone<T extends TaskStorable>(_context?: Partial<T>): string {
    return (this.constructor as typeof TaskStorable).taskPrefixDone
  }

  getTaskTtl<T extends TaskStorable>(_context?: Partial<T>): number | undefined {
    return (this.constructor as typeof TaskStorable).taskTtl
  }

  getTaskTtlDone<T extends TaskStorable>(_context?: Partial<T>): number | undefined {
    return (this.constructor as typeof TaskStorable).taskTtlDone
  }

  // Factory method to create an instance with the necessary context
  static createInstance<T extends TaskStorable>(this: Constructor<T>, context?: Partial<T>): T {
    const instance = new this()
    Object.assign(instance, context)
    return instance
  }

  static async _load<T extends TaskStorable>(this: Constructor<T>, sm: StoreManager, context?: Partial<T>): Promise<T> {
    const instance = (this as any).createInstance(context)
    // get all task keys
    const keys = await sm.keys(`${instance.getTaskPrefix(context)}*`, true)
    // get the first task (del when finish)
    const serializedTask: string = (await sm.get(keys[0]))! // never undefined ensured by keys isWait=true

    return instance.fromString(serializedTask)
  }

  static async load<T extends TaskStorable>(this: Constructor<T>, sm: StoreManager, context?: Partial<T>): Promise<T> {
    return await (this as any)._load(sm, context)
  }

  async save<T extends TaskStorable>(sm: StoreManager, context?: Partial<T>) {
    await sm.set(this.getTaskPrefix(context) + this.toKey(), this.toString(), this.getTaskTtl(context))
  }

  async remove<T extends TaskStorable>(sm: StoreManager, context?: Partial<T>) {
    await sm.del(this.getTaskPrefix(context) + this.toKey())
  }

  async done<T extends TaskStorable>(sm: StoreManager, context?: Partial<T>) {
    await sm.set(this.getTaskPrefixDone(context) + this.toKey(), this.toString(), this.getTaskTtlDone(context))
    await this.remove(sm)
  }
}
