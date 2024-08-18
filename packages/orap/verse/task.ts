import type { TaskFlow } from '../flow/task'
import { TaskClassForVerse } from '../task/verse'
import type { Verse } from './interface'

export class TaskVerse implements Verse {
  ClassTask: any // TODO: type here

  constructor(private flow: TaskFlow) {
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
    this.flow.logger.debug('creating task with args:', args)
    const task = new TaskClassForVerse(this.flow, args)
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
}
