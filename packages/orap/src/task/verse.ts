import { isJsonString, isString, stripPrefix } from '@ora-io/utils'
import type { TaskFlow } from '../flow'
import type { Context } from './context'
import { TaskStorable } from './storable'

/**
 * used in TaskVerse only
 */
export class TaskRaplized extends TaskStorable {
  // TODO: fetch members from event params
  constructor(
    private flow: TaskFlow,
    public eventLog: Array<any> = [],
    private id?: string,
  ) { super() }

  async getTaskPrefix(_context?: Context): Promise<string> {
    return isString(this.flow.taskPrefix)
      ? this.flow.taskPrefix
      : await this.flow.taskPrefix(this.flow.ctx)
  }

  async getTaskPrefixDone(_context?: Context): Promise<string> {
    return isString(this.flow.donePrefix)
      ? this.flow.donePrefix
      : await this.flow.donePrefix(this.flow.ctx)
  }

  get taskTtl(): number | undefined {
    return this.flow.taskTtl
  }

  get taskTtlDone(): number | undefined {
    return this.flow.doneTtl
  }

  async toKey(): Promise<string> {
    if (!this.id)
      this.id = await this.flow.toKeyFn(...this.eventLog)
    return this.id
  }

  async handle(): Promise<void> {
    if (await this.flow.handleFn(...this.eventLog))
      await this.flow.successFn(this)
    else
      await this.flow.failFn(this)
  }

  /** ***************** overwrite **************/

  async save() {
    await super.save(this.flow.sm, this.flow.ctx)
  }

  async load(): Promise<TaskRaplized>
  async load(key: string): Promise<TaskRaplized>
  async load(key?: string) {
    if (key) {
      return await this.loadByKey(key)
    }
    else {
      const prefix = await this.getTaskPrefix(this.flow.ctx)
      // get all task keys
      const keys = await this.flow.sm.keys(`${prefix}*`, true)
      // get the first task (del when finish)
      const serializedTask: string = (await this.flow.sm.get(keys[0]))! // never undefined ensured by keys isWait=true
      this.fromString(serializedTask)
      // set key to task id
      this.id = stripPrefix(keys[0], prefix)
    }
    return this
  }

  async loadByKey(key: string) {
    const serializedTask: string = (await this.flow.sm.get(key))! // never undefined ensured by keys isWait=true
    this.fromString(serializedTask)
    // set key to task id
    this.id = stripPrefix(key, await this.getTaskPrefix(this.flow.ctx))

    return this
  }

  async done() {
    await super.done(this.flow.sm, this.flow.ctx)
  }

  async remove() {
    await super.remove(this.flow.sm, this.flow.ctx)
  }

  /**
   * overwrite to include eventLog only, exclude flow.
   * @returns
   */
  toString() {
    return this.stringify(this.eventLog)
  }

  fromString(jsonString: string) {
    if (isJsonString(jsonString))
      this.eventLog = JSON.parse(jsonString)

    return this
  }
}
