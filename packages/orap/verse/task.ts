import type { TaskFlow } from '../flow/task'
import { TaskClassForVerse } from '../task/verse'
import type { Verse } from './interface'

export class TaskVerse implements Verse {
  constructor(private flow: TaskFlow) {
  }
  // new from flow
  // _from(flow: TaskFlow): TaskVerse {
  //   const flowIns = new TaskVerse(); // Create B instance
  //   Object.assign(flowIns, flow); // Copy all properties from A to B
  //   return flowIns;
  // }

  get logger() {
    return this.flow.logger
  }

  /**
   * create a task for this Task type
   * @param args exactly the same with eventsignal.callback, i.e. event log fields + eventlog obj
   */
  async createTask(...args: Array<any>) {
    this.logger.debug('creating task with args:', args)
    const task = new TaskClassForVerse(this.flow, args)
    task.save()
  }

  async startTaskProcessor() {
    // used only for getTaskPrefix in log
    this.logger.debug(`task with context ${this.flow.context?.toString()} starts flowing. Will load tasks with prefix "${this.flow.taskPrefixFn(this.flow.context)}"`)

    // TODO: change to polling
    while (true) {
      const task = await (new TaskClassForVerse(this.flow)).load()

      await task.handle()
    }
  }

  /**
   * start processor for this task flow
   */
  play() {
    this.startTaskProcessor()
      .catch((reason) => {
        // TODO: print full Error
        this.logger.error('TaskVerse.play Error:', reason)
      })
  }
}
