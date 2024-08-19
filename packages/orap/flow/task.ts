import { alphabetHex, memoryStore, randomStr } from '@ora-io/utils'
import type { Context, TaskRaplized } from '../task'
import { StoreManager } from '../store'
import { TaskVerse } from '../verse/task'
import type { Flow, HandleFn, HandleResultFn, Prefix, ToKeyFn } from './interface'
import type { EventFlow } from './event'

export class TaskFlow implements Flow {
  sm: StoreManager = new StoreManager(memoryStore())
  taskPrefix: Prefix = 'Task:'
  donePrefix: Prefix = 'Done-Task:'
  taskTtl?: number
  doneTtl?: number
  toKeyFn: ToKeyFn = _ => randomStr(8, alphabetHex)
  handleFn: HandleFn = (_) => { throw new Error('required to set task handler through .handle()') }
  successFn: HandleResultFn = async (task: TaskRaplized) => {
    await task.done()
    await task.remove()
  }

  failFn: HandleResultFn = async (task: TaskRaplized) => {
    await task.remove()
  }

  ctx?: Context

  constructor(
    private parentFlow: EventFlow,
  ) { }

  cache(sm: StoreManager) {
    this.sm = sm
    return this
  }

  context(ctx: Context) {
    this.ctx = ctx
    return this
  }

  prefix(taskPrefix: Prefix, donePrefix: Prefix): this {
    this.taskPrefix = taskPrefix
    this.donePrefix = donePrefix
    return this
  }

  ttl({ taskTtl, doneTtl }: { taskTtl: number; doneTtl: number }): this {
    this.taskTtl = taskTtl
    this.doneTtl = doneTtl
    return this
  }

  key(toKey: ToKeyFn): this {
    this.toKeyFn = toKey
    return this
  }

  handle(handler: HandleFn): this {
    this.handleFn = handler
    return this
  }

  success(onSuccess: HandleResultFn): this {
    this.successFn = onSuccess
    return this
  }

  fail(onFail: HandleResultFn): this {
    this.failFn = onFail
    return this
  }

  another(): EventFlow {
    return this.parentFlow!
  }

  get logger() {
    return this.parentFlow!.logger
  }

  assemble(): TaskVerse {
    return new TaskVerse(this)
  }
}
