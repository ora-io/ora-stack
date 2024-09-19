import type { NextFunction } from '../flow'
import type { TaskFlow } from '../flow/task'
import { TaskRaplized } from '../task/verse'
import type { Verse } from './interface'

export class TaskVerse implements Verse {
  private loading = false

  constructor(private _flow: TaskFlow) {
  }

  get flow() {
    return this._flow
  }

  /**
   * create a task for this Task type
   * @param args exactly the same with eventsignal.callback, i.e. event log fields + eventlog obj
   */
  async createTask(...args: Array<any>) {
    const next = args.pop()
    const task = new TaskRaplized(this._flow, args)
    task.save().finally(async () => {
      if (this.loading)
        return
      this.loading = true
      await this.loadAndHandleAll(task, next)
      this.loading = false
    })
    return this
  }

  async loadAndHandleAll(task: TaskRaplized, next: NextFunction = () => {}) {
    const prefix = await task.getTaskPrefix(this.flow.ctx)
    // get all task keys
    let keys = await this.flow.sm.keys(`${prefix}*`)
    while (true) {
      // break if no more keys
      if (keys.length === 0)
        break
      for (const key of keys) {
        await task.loadByKey(key)
        await task.handle()
      }
      // get all task keys again
      keys = await this.flow.sm.keys(`${prefix}*`)
    }

    await task.handleComposeFns(next)
  }

  preload(next?: NextFunction) {
    this.loading = true
    const task = new TaskRaplized(this._flow, [])
    this.loadAndHandleAll(task, next).finally(() => {
      this.loading = false
    })
  }

  /**
   * start processor for this task _flow
   */
  play(next?: NextFunction) {
    this.preload(next)
  }
}
