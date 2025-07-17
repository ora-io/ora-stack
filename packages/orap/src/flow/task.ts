import type { Milliseconds } from '@ora-io/utils'
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

const defaultFailFn: HandleResultFn = async (task: TaskRaplized) => {
  await task.remove()
}

export interface TaskFlowTTL { taskTtl: Milliseconds; doneTtl: Milliseconds }

export interface TaskFlowParams {
  context?: Context
  taskPrefix?: Prefix
  donePrefix?: Prefix
  taskTtl?: Milliseconds
  doneTtl?: Milliseconds
  cache?: StoreManager
  toKeyFn?: ToKeyFn
  handleFn?: HandleFn
  successFn?: HandleResultFn
  failFn?: HandleResultFn
}

// TODO: add 'Failed-Task:' ?
export class TaskFlow implements Flow {
  sm: StoreManager = new StoreManager(memoryStore())
  taskPrefix: Prefix = 'Task:'
  donePrefix: Prefix = 'Done-Task:'
  taskTtl: Milliseconds = 60 * 1000
  doneTtl: Milliseconds = 60 * 1000
  toKeyFn: ToKeyFn = defaultToKeyFn
  handleFn: HandleFn = defaultHandleFn
  successFn: HandleResultFn = defaultSuccessFn
  failFn: HandleResultFn = defaultFailFn

  private _middlewares: Array<HandleFn> = []
  private _verse: TaskVerse = new TaskVerse(this)

  ctx?: Context

  get verse() {
    return this._verse
  }

  constructor(
    private parentFlow: EventFlow,
    params?: TaskFlowParams,
  ) {
    params?.context && this.context(params?.context)
    const taskPrefix = params?.taskPrefix ?? this.taskPrefix
    const donePrefix = params?.donePrefix ?? this.donePrefix
    this.prefix(taskPrefix, donePrefix)
    const taskTtl = params?.taskTtl ?? this.taskTtl
    const doneTtl = params?.doneTtl ?? this.doneTtl
    this.ttl(taskTtl, doneTtl)
    params?.cache && this.cache(params?.cache)
    params?.toKeyFn && this.key(params?.toKeyFn)
    params?.handleFn && this.handle(params?.handleFn)
    params?.successFn && this.success(params?.successFn)
    params?.failFn && this.fail(params?.failFn)
  }

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

  ttl(TTLs: Milliseconds): this
  ttl(TTLs: TaskFlowTTL): this
  ttl(taskTtl: Milliseconds, doneTtl: Milliseconds): this
  ttl(TTLs: TaskFlowTTL | Milliseconds, doneTtl?: Milliseconds): this {
    if (typeof TTLs === 'number') {
      this.taskTtl = TTLs
      this.doneTtl = doneTtl ?? TTLs
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

  stop() {
    this._verse.stop()
  }

  restart() {
    this._verse.restart()
  }
}
