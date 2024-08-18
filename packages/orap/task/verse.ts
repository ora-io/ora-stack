import assert from 'assert'
import type { TaskFlow } from '../flow'
import type { Context } from './context'
import { TaskStorable } from './storable'

/**
 * used in TaskVerse only
 */
export class TaskClassForVerse extends TaskStorable {
  // TODO: fetch members from event params
  constructor(
    private flow: TaskFlow,
    public eventLog: Array<any> = [],
    private id?: string,
  ) { super() }

  getTaskPrefix(_context?: Context): string {
    return this.flow.taskPrefixFn(this.flow.context)
  }

  getTaskPrefixDone(_context?: Context): string {
    return this.flow.donePrefixFn(this.flow.context)
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
    this.flow.logger.debug('[+] handleTask', await this.toKey(), this.toString())
    if (await this.flow.handleFn(...this.eventLog))
      await this.flow.successFn(this)
    else
      await this.flow.failFn(this)
  }

  /** ***************** overwrite **************/

  async save() {
    this.flow.logger.debug('[*] save task', this.toString())
    await super.save(this.flow.sm, this.flow.context)
  }

  private _trimPrefix(key: string) {
    const prefix = this.getTaskPrefix(this.flow.context)
    assert(key.startsWith(prefix))
    return key.slice(prefix.length)
  }

  async load() {
    // this.flow.logger.debug('[*] load task 1', this)
    // get all task keys
    const keys = await this.flow.sm.keys(`${this.getTaskPrefix(this.flow.context)}*`, true)
    // get the first task (del when finish)
    const serializedTask: string = (await this.flow.sm.get(keys[0]))! // never undefined ensured by keys isWait=true

    this.fromString(serializedTask)

    // set key to task id
    this.id = this._trimPrefix(keys[0])

    // this.flow.logger.debug('[*] load task 2', await this.toKey())

    return this
  }

  async done() {
    this.flow.logger.debug('[*] done task', await this.toKey())
    await super.done(this.flow.sm, this.flow.context)
  }

  async remove() {
    this.flow.logger.debug('[*] remove task', await this.toKey())
    await super.remove(this.flow.sm, this.flow.context)
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
