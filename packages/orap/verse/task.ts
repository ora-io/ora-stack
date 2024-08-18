import type { Constructor } from '@ora-io/utils'
import type { TaskFlow } from '../flow/task'
import type { Context } from '../task'
import { TaskStorable } from '../task'
import type { Verse } from './interface'

export class TaskVerse implements Verse {
  ClassTask: any // TODO: type here

  constructor(private flow: TaskFlow) {
    this.ClassTask = this.createClass()
  }
  // new from flow
  // _from(flow: TaskFlow): TaskVerse {
  //   const flowIns = new TaskVerse(); // Create B instance
  //   Object.assign(flowIns, flow); // Copy all properties from A to B
  //   return flowIns;
  // }

  /**
   * create a task for this Task type
   * @param args exactly the same with eventsignal.callback, i.e. event log fields + eventlog obj
   */
  async createTask(...args: Array<any>) {
    const task = new this.ClassTask(...args)
    task.save()
  }

  async startTaskProcessor() {
    // used only for getTaskPrefix in log
    const _ins = new this.ClassTask()
    this.flow.logger.debug(`task with context ${this.flow.context?.toString()
       } starts flowing. Will load tasks with prefix "${_ins.getTaskPrefix(this.flow.context)}"`)

    // TODO: change to polling
    while (true) {
      const task = await this.ClassTask.load()

      if (await task.handle())
        await this.flow.successFn(this, this.flow.context)
      else
        await this.flow.failFn(this, this.flow.context)
    }
  }

  /**
   * start processor for this task flow
   */
  async play() {
    this.startTaskProcessor()
  }

  createClass() {
    // pass args from verse to class to bypass 'this' overwriting
    const flow = this.flow

    return class ClassTask extends TaskStorable {
      static readonly taskTtl: number | undefined = flow.taskTtl
      static readonly taskTtlDone: number | undefined = flow.doneTtl

      // TODO: fetch members from event params
      constructor(
        public id?: string,
        public from?: string,
        public to?: string,
        public amount?: number,
      ) { super() }

      getTaskPrefix(_context?: Context): string {
        return flow.taskPrefixFn(flow.context)
      }

      getTaskPrefixDone(_context?: Context): string {
        return flow.donePrefixFn(flow.context)
      }

      toKey(): string {
        return flow.toKeyFn(this)
      }

      async handle() {
        flow.logger.debug('[+] handleTask', this.toString())
        return await flow.handleFn(this, flow.context)
      }

      /** ***************** overwrite **************/

      async save() {
        flow.logger.debug('[*] save task', this.toString())
        await super.save(flow.sm!, flow.context)
      }

      static async load<T extends TaskStorable>(this: Constructor<T>): Promise<T> {
        const task = await (this as any)._load(flow.sm!, flow.context)
        flow.logger.debug('[*] load task', task.toKey())
        return task
      }

      async done() {
        flow.logger.debug('[*] done task', this.toKey())
        await super.done(flow.sm!, flow.context)
      }

      async remove() {
        flow.logger.debug('[*] remove task', this.toKey())
        await super.remove(flow.sm!, flow.context)
      }
    }
  }
}
