import { isString, stripPrefix } from '@ora-io/utils'
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
    this.flow.logger.debug('[*] handle task:', await this.toKey())
    if (await this.flow.handleFn(...this.eventLog))
      await this.flow.successFn(this)
    else
      await this.flow.failFn(this)
  }

  /** ***************** overwrite **************/

  async save() {
    this.flow.logger.debug('[*] save task:', this.toString())
    await super.save(this.flow.sm, this.flow.ctx)
  }

  async load() {
    // this.flow.logger.debug('[*] load task 1', this)
    const prefix = await this.getTaskPrefix(this.flow.ctx)
    // get all task keys
    const keys = await this.flow.sm.keys(`${prefix}*`, true)
    // get the first task (del when finish)
    const serializedTask: string = (await this.flow.sm.get(keys[0]))! // never undefined ensured by keys isWait=true

    this.fromString(serializedTask)

    // set key to task id
    this.id = stripPrefix(keys[0], prefix)

    // this.flow.logger.debug('[*] load task 4', await this.toKey())

    return this
  }

  async done() {
    this.flow.logger.debug('[*] done task:', await this.toKey())
    await super.done(this.flow.sm, this.flow.ctx)
  }

  async remove() {
    this.flow.logger.debug('[*] remove task:', await this.toKey())
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
    this.eventLog = JSON.parse(jsonString)
    return this
  }
}
