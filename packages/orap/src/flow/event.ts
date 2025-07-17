import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { Context } from '../task'
import type { TaskFlowParams } from '../flow/task'
import { TaskFlow } from '../flow/task'
import { StoreManager } from '../store'
import type { CrosscheckOptions, EventSignalRegisterParams } from '../signal'
import { EventVerse } from '../verse/event'
import type { TaskVerse } from '../verse/task'
import type { Flow, HandleFn } from './interface'
import type { OrapFlow } from './orap'

export class EventFlow implements Flow {
  private _taskFlows: TaskFlow[] = []

  handleFn: HandleFn
  partialCrosscheckOptions?: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>

  private _subscribeProvider?: Providers
  private _crosscheckProvider?: Providers

  private _verse: EventVerse = new EventVerse(this)

  get verse() {
    return this._verse
  }

  constructor(
    private parentFlow?: OrapFlow,
    public params?: EventSignalRegisterParams,
    handleFn?: HandleFn, // return: succ & continue if true, stop if false
  ) {
    // Default handleFn
    this.handleFn = handleFn ?? (async (..._args: Array<any>) => {
      return true
    })
  }

  get taskFlows() {
    return this._taskFlows
  }

  crosscheck(options?: CrosscheckOptions) {
    this.partialCrosscheckOptions = options
    return this
  }

  task(params?: TaskFlowParams): TaskFlow
  task(sm?: StoreManager | TaskFlowParams, context?: Context): TaskFlow {
    let tf: TaskFlow
    if (sm instanceof StoreManager) {
      tf = new TaskFlow(this)
      if (sm)
        tf.cache(sm)
      if (context)
        tf.context(context)
    }
    else {
      tf = new TaskFlow(this, sm)
    }
    this._taskFlows.push(tf)
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
    return this._taskFlows.map(flow => flow.assemble())
  }

  // TODO: use _assemble? for ux?
  assemble(): EventVerse {
    const taskVerses = this._assembleTaskFlows()
    return new EventVerse(this).setTaskVerses(taskVerses)
  }

  another(): OrapFlow {
    return this.parentFlow!
  }

  stop() {
    this._verse.stop()
  }

  restart() {
    this._verse.restart()
  }
}
