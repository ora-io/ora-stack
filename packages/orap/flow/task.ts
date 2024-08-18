import { alphabetHex, randomStr } from '@ora-io/utils'
import type { Context } from '../task'
import type { StoreManager } from '../store'
import { TaskVerse } from '../verse/task'
import type { Flow } from './interface'
import type { EventFlow } from './event'

export class TaskFlow implements Flow {
  taskPrefixFn: (context?: any) => string = _ => 'Task:'
  donePrefixFn: (context?: any) => string = _ => 'Done-Task:'
  taskTtl?: number
  doneTtl?: number
  toKeyFn: (task: any) => string = _ => randomStr(8, alphabetHex)
  handleFn: (task: any, context?: any) => Promise<boolean> = (_, __) => { throw new Error('required to set task handler through .handle()') }
  successFn: (task: any, context?: any) => Promise<void> = async (task: any) => {
    await task.done()
    await task.remove()
  }

  failFn: (task: any, context?: any) => Promise<void> = async (task: any) => {
    await task.remove()
  }

  // event(params: any): this {
  //   this.eventParams = params;
  //   return this;
  // }

  // crosscheck(params: any): this {
  //   this.crossCheckParams = params;
  //   return this;
  // }

  constructor(
    private parentFlow: EventFlow,
    // TODO: let user pass in sm or store?
    public sm: StoreManager,
    public context?: Context) {
  }

  prefix(taskPrefixFn: (context?: Context) => string, donePrefixFn: (context?: Context) => string): this {
    this.taskPrefixFn = taskPrefixFn
    this.donePrefixFn = donePrefixFn
    return this
  }

  ttl({ taskTtl, doneTtl }: { taskTtl: number; doneTtl: number }): this {
    this.taskTtl = taskTtl
    this.doneTtl = doneTtl
    return this
  }

  key(toKey: (task: any) => string): this {
    this.toKeyFn = toKey
    return this
  }

  handle(handler: (task: any, context?: Context) => Promise<boolean>): this {
    this.handleFn = handler
    return this
  }

  success(onSuccess: (task: any, context?: Context) => Promise<void>): this {
    this.successFn = onSuccess
    return this
  }

  fail(onFail: (task: any, context?: Context) => Promise<void>): this {
    this.failFn = onFail
    return this
  }

  another(): EventFlow {
    return this.parentFlow!
  }

  // TODO: make it orap universal logger
  get logger() {
    return this.parentFlow!.logger
  }

  assemble(): TaskVerse {
    return new TaskVerse(this)
  }
}
