import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { Context } from '../task'
import { TaskFlow } from '../flow/task'
import type { StoreManager } from '../store'
import type { EventSignalRegisterParams } from '../signal'
import { EventVerse } from '../verse/event'
import type { TaskVerse } from '../verse/task'
import type { Flow, HandleFn } from './interface'
import type { OrapFlow } from './orap'

export class EventFlow implements Flow {
  private taskFlows: TaskFlow[] = []

  handleFn: HandleFn
  partialCrosscheckOptions?: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>

  private _subscribeProvider?: Providers
  private _crosscheckProvider?: Providers

  constructor(
    private parentFlow?: OrapFlow,
    public params?: EventSignalRegisterParams,
    handleFn?: HandleFn, // return: succ & continue if true, stop if false
  ) {
    // Default handleFn
    this.handleFn = handleFn ?? (async (..._args: Array<any>) => {
      const _contractEventPayload = _args.pop()
      this.logger.debug('handle event signal', _contractEventPayload.log.transactionHash)
      return true
    })
  }

  get logger() {
    return this.parentFlow!._logger
  }

  crosscheck(options?: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>) {
    this.partialCrosscheckOptions = options
    return this
  }

  // task(store: Store, context?: Context): TaskFlow {
  task(sm?: StoreManager, context?: Context): TaskFlow {
    const tf = new TaskFlow(this)
    if (sm)
      tf.cache(sm)
    if (context)
      tf.context(context)
    this.taskFlows.push(tf)
    return tf
  }

  get subscribeProvider() {
    return this._subscribeProvider
  }

  setSubscribeProvider(provider: Providers) {
    this._subscribeProvider = provider
    return this
  }

  get crosscheckProvider() {
    return this._crosscheckProvider
  }

  setCrosscheckProvider(provider: Providers) {
    this._crosscheckProvider = provider
    return this
  }

  handle(handleFn: HandleFn) {
    this.handleFn = handleFn
    return this
  }

  private _assembleTaskFlows(): TaskVerse[] {
    return this.taskFlows.map(flow => flow.assemble())
  }

  // TODO: use _assemble? for ux?
  assemble(): EventVerse {
    const taskVerses = this._assembleTaskFlows()
    return new EventVerse(this).setTaskVerses(taskVerses)
  }

  another(): OrapFlow {
    return this.parentFlow!
  }
}
