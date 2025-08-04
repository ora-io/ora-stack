import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { ContractAddress } from '@ora-io/utils/src'
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
  private _addresses: ContractAddress[] = []
  private _params: EventSignalRegisterParams

  get verse() {
    return this._verse
  }

  get params() {
    return this._params
  }

  constructor(
    private parentFlow: OrapFlow,
    params: EventSignalRegisterParams,
    handleFn?: HandleFn, // return: succ & continue if true, stop if false
  ) {
    this._params = params
    this._addresses = Array.isArray(this.params.address) ? this.params.address : [this.params.address]
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
    this._verse.setTaskVerses(this._taskFlows.map(flow => flow.verse))
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
    return this.parentFlow
  }

  stop(): this {
    this._verse.stop()
    return this
  }

  restart(): this {
    if (this.parentFlow.wsProvider)
      this._subscribeProvider = this.parentFlow.wsProvider
    else
      throw new Error('wsProvider is not set, cannot restart')
    if (this.parentFlow.httpProvider)
      this._crosscheckProvider = this.parentFlow.httpProvider
    else
      throw new Error('httpProvider is not set, cannot restart')
    this._verse.restart()
    return this
  }

  address(_index: number, _address: ContractAddress): this
  address(address: ContractAddress): this
  address(_first: ContractAddress | number, _second?: ContractAddress): this {
    if (typeof _first === 'number') {
      if (!_second)
        throw new Error('address is required')
      if (Array.isArray(this._params.address))
        Reflect.set(this._addresses, _first, _second)

      else this._addresses = [_second!]
    }
    else
      if (Array.isArray(this._params.address)) { this._addresses = [...new Set([...this._params.address, _first])] }
      else { this._addresses = [_first] }
    this._params.address = this._addresses
    return this
  }

  addresses(addresses: ContractAddress[]): this {
    this._addresses = addresses
    this._params.address = this._addresses
    return this
  }
}
