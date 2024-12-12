import type { Milliseconds } from '@ora-io/utils'
import { argParser, composeFns, isJsonString, isString, stripPrefix } from '@ora-io/utils'
import type { TaskFlow } from '../flow'
import { HandleSuccessMiddleware } from '../middlewares/HandleSuccessMiddleware'
import { HandleFailedMiddleware } from '../middlewares/private'
import type { Context } from './context'
import { TaskStorable } from './storable'

/**
 * used in TaskVerse only
 */
export class TaskRaplized extends TaskStorable {
  // TODO: fetch members from event params
  constructor(
    public flow: TaskFlow,
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

  get taskTtl(): Milliseconds | undefined {
    return this.flow.taskTtl
  }

  get taskTtlDone(): Milliseconds | undefined {
    return this.flow.doneTtl
  }

  async toKey(): Promise<string> {
    if (!this.id)
      this.id = await this.flow.toKeyFn(...this.eventLog)
    return this.id
  }

  async handle(): Promise<void> {
    const middlewares = [...this.flow.middlewares]
    middlewares.unshift(HandleFailedMiddleware)
    middlewares.push(HandleSuccessMiddleware)
    await composeFns(this)(middlewares, this.eventLog)
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
    const res = argParser.parse(this.eventLog)
    return this.stringify(res)
  }

  fromString(jsonString: string) {
    if (isJsonString(jsonString))
      this.eventLog = argParser.serialize(JSON.parse(jsonString))

    return this
  }
}
