import type { TaskFlow } from '../flow'
import type { Context } from './context'
import { TaskStorable } from './storable'

export class TaskClassForVerse extends TaskStorable {
  // TODO: fetch members from event params
  constructor(
    private flow: TaskFlow,
    private eventLog: Record<string, any>,
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

  toKey(): string {
    return this.flow.toKeyFn(this)
  }

  async handle() {
    this.flow.logger.debug('[+] handleTask', this.toString())
    return await this.flow.handleFn(this.eventLog, this.flow.context)
  }

  /** ***************** overwrite **************/

  async save() {
    this.flow.logger.debug('[*] save task', this.toString())
    await super.save(this.flow.sm, this.flow.context)
  }

  async load() {
    // get all task keys
    const keys = await this.flow.sm.keys(`${this.getTaskPrefix(this.flow.context)}*`, true)
    // get the first task (del when finish)
    const serializedTask: string = (await this.flow.sm.get(keys[0]))! // never undefined ensured by keys isWait=true

    const task = this.fromString(serializedTask)

    this.flow.logger.debug('[*] load task', task.toKey())

    return task
  }

  async done() {
    this.flow.logger.debug('[*] done task', this.toKey())
    await super.done(this.flow.sm, this.flow.context)
  }

  async remove() {
    this.flow.logger.debug('[*] remove task', this.toKey())
    await super.remove(this.flow.sm, this.flow.context)
  }
}
