import type { Constructor } from '@ora-io/utils'
import type { StoreManager } from '../store/storemanager'
import { TaskBase } from './base'

export abstract class TaskStorable extends TaskBase {
  // overwrite these for store key customize
  static readonly taskPrefix: string = 'Task:'
  static readonly taskPrefixDone: string = 'Done-Task:'
  static readonly taskTtl: number | undefined = undefined
  static readonly taskTtlDone: number | undefined = undefined

  getTaskPrefix(): string {
    return (this.constructor as typeof TaskStorable).taskPrefix
  }

  getTaskPrefixDone(): string {
    return (this.constructor as typeof TaskStorable).taskPrefixDone
  }

  getTaskTtl(): number | undefined {
    return (this.constructor as typeof TaskStorable).taskTtl
  }

  getTaskTtlDone(): number | undefined {
    return (this.constructor as typeof TaskStorable).taskTtlDone
  }

  static async _load<T extends TaskStorable>(this: Constructor<T>, sm: StoreManager): Promise<T> {
    const instance = new this()
    // get all task keys
    const keys = await sm.keys(`${instance.getTaskPrefix()}*`, true)
    // get the first task (del when finish)
    const serializedTask: string = (await sm.get(keys[0]))! // never undefined ensured by keys isWait=true

    return instance.fromString(serializedTask)
  }

  static async load<T extends TaskStorable>(this: Constructor<T>, sm: StoreManager): Promise<T> {
    return await (this as any)._load(sm)
  }

  async save(sm: StoreManager) {
    await sm.set(this.getTaskPrefix() + this.toKey(), this.toString(), this.getTaskTtl())
  }

  async remove(sm: StoreManager) {
    await sm.del(this.getTaskPrefix() + this.toKey())
  }

  async done(sm: StoreManager) {
    await sm.set(this.getTaskPrefixDone() + this.toKey(), this.toString(), this.getTaskTtlDone())
    await this.remove(sm)
  }
}
