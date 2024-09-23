import type { Awaitable } from '@ora-io/utils'
import type { Context, TaskRaplized } from '../task'
import type { Verse } from '../verse/interface'

export type ToKeyFn = (...eventLog: Array<any>) => Awaitable<string>
export type NextFunction = (...args: any[]) => void
export type HandleFn = (...args: any[]) => Awaitable<any>
export type HandleResultFn = (task: TaskRaplized) => Awaitable<void>
export type PrefixFn = ((...eventLog: Array<any>) => Awaitable<string>) | ((context?: Context) => string) // the later context one is kind of useless, can rm
export type Prefix = PrefixFn | string

export interface Flow {
  /**
   * assemble() always return a Verse class, with a play function as for "launch processor"
   * */
  assemble(): Verse
}
