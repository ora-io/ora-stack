import type { TaskFlow } from '../flow/task'
import { TaskRaplized } from '../task/verse'
import type { Verse } from './interface'

export class TaskVerse implements Verse {
  constructor(private flow: TaskFlow) {
  }

  get logger() {
    return this.flow.logger
  }

  /**
   * create a task for this Task type
   * @param args exactly the same with eventsignal.callback, i.e. event log fields + eventlog obj
   */
  async createTask(...args: Array<any>) {
    this.logger.debug('creating task with args:', args)
    const task = new TaskRaplized(this.flow, args)
    task.save()
  }

  async startTaskProcessor() {
    this.logger.debug(`task with context ${this.flow.ctx?.toString()} starts flowing. Will load tasks with prefix "${await (new TaskRaplized(this.flow)).getTaskPrefix(this.flow.ctx)}"`)

    // TODO: change to polling
    while (true) {
      const task = await (new TaskRaplized(this.flow)).load()

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
