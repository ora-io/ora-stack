import { alphabetHex, memoryStore, randomStr } from '@ora-io/utils'
import type { Context, TaskRaplized } from '../task'
import { StoreManager } from '../store'
import { TaskVerse } from '../verse/task'
import type { Flow, HandleFn, HandleResultFn, Prefix, ToKeyFn } from './interface'
import type { EventFlow } from './event'

const defaultSuccessFn: HandleResultFn = async (task: TaskRaplized) => {
  await task.done()
  await task.remove()
}

const defaultHandleFn: HandleFn = () => {
  throw new Error('required to set task handler through .handle()')
}

const defaultToKeyFn: ToKeyFn = _ => randomStr(8, alphabetHex)
export type TaskFlowTTL = { taskTtl: number; doneTtl: number } | number

// TODO: add 'Failed-Task:' ?
export class TaskFlow implements Flow {
  sm: StoreManager = new StoreManager(memoryStore())
  taskPrefix: Prefix = 'Task:'
  donePrefix: Prefix = 'Done-Task:'
  taskTtl?: number
  doneTtl?: number
  toKeyFn: ToKeyFn = defaultToKeyFn
  handleFn: HandleFn = defaultHandleFn
  successFn: HandleResultFn = defaultSuccessFn

  private _middlewares: Array<HandleFn> = []

  failFn: HandleResultFn = async (task: TaskRaplized) => {
    await task.remove()
  }

  ctx?: Context

  constructor(
    private parentFlow: EventFlow,
  ) { }

  get middlewares() {
    return this._middlewares
  }

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

  ttl(TTLs: TaskFlowTTL): this {
    if (typeof TTLs === 'number') {
      this.taskTtl = TTLs
      this.doneTtl = TTLs
    }
    else {
      this.taskTtl = TTLs.taskTtl
      this.doneTtl = TTLs.doneTtl
    }
    return this
  }

  key(toKey: ToKeyFn): this {
    this.toKeyFn = toKey
    return this
  }

  handle(handler: HandleFn): this {
    this.handleFn = handler
    this._middlewares.push(handler)
    return this
  }

  use(middleware: HandleFn): this {
    this._middlewares.push(middleware)
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

  assemble(): TaskVerse {
    return new TaskVerse(this)
  }
}
