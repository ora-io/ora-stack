import type { EventFragment, Interface, InterfaceAbi, Log } from 'ethers'
import { ContractEventPayload, ContractUnknownEventPayload, ethers } from 'ethers'
import { AutoCrossChecker, ONE_MINUTE_MS, RekuProviderManager } from '@ora-io/reku'
import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { ContractAddress } from '@ora-io/utils'
import type { Signal } from './interface'

export interface EventSignalRegisterParams {
  address: ContractAddress
  abi: Interface | InterfaceAbi
  eventName: string
  // esig?: string,
}

export interface CrosscheckParams {
  /**
   * Disable crosscheck
   */
  disabled?: boolean
}

export type CrosscheckOptions = CrosscheckParams & Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>

export type EventSignalCallback = ethers.Listener

export class EventSignal implements Signal {
  provider?: Providers
  contract: ethers.Contract
  esig: string
  eventFragment: EventFragment

  subscribeCallback: EventSignalCallback
  crosscheckCallback: EventSignalCallback

  crosschecker?: AutoCrossChecker
  crosscheckerOptions?: AutoCrossCheckParam
  crosscheckerParams?: CrosscheckParams

  constructor(
    public params: EventSignalRegisterParams,
    public callback: EventSignalCallback,
    crosscheckOptions?: CrosscheckOptions,
  ) {
    this.contract = new ethers.Contract(
      params.address,
      params.abi,
    )

    // Get the event fragment by name
    const iface = this.contract.interface
    const _ef = iface.getEvent(params.eventName)
    if (!_ef)
      throw new Error('event not found in abi')
    this.eventFragment = _ef

    this.esig = this.eventFragment.topicHash

    // to align with crosschecker onMissing, parse the last arg from ContractEventPayload to EventLog
    this.subscribeCallback = async (...args: Array<any>) => {
      const _contractEventPayload = args.pop()
      await this.callback(...args, _contractEventPayload)
      await this.crosschecker?.cache!.addLog(_contractEventPayload.log)
    }
    // to align with subscribe listener, parse event params and add EventLog to the last
    this.crosscheckCallback = async (log: Log) => {
      const parsedLog = this.contract.interface.decodeEventLog(this.eventFragment, log.data, log.topics)
      const payload = this._wrapContractEventPayload(log)
      await this.callback(...parsedLog, payload)
    }

    // set crosscheckOptions only when speicified
    if (crosscheckOptions)
      this._setCrosscheckOptions(crosscheckOptions)
  }

  private _wrapContractEventPayload(log: Log) {
    if (this.eventFragment)
      return new ContractEventPayload(this.contract, this.subscribeCallback, this.params.eventName, this.eventFragment, log)
    return new ContractUnknownEventPayload(this.contract, this.subscribeCallback, this.params.eventName, log)
  }

  private _setCrosscheckOptions(options: CrosscheckOptions) {
    const {
      pollingInterval = ONE_MINUTE_MS * 60,
      ignoreLogs = [],
    } = options ?? {}
    // save crosschecker param
    this.crosscheckerOptions = {
      ...options,
      address: this.params.address,
      topics: [this.esig],
      onMissingLog: this.crosscheckCallback,
      pollingInterval,
      ignoreLogs,
    }
    this.crosscheckerParams = {
      disabled: options?.disabled,
    }
  }

  // TODO: should be wsProvider only?
  listen(provider: Providers, crosscheckProvider?: Providers) {
    this.provider = provider

    // start event listener
    this.startEventListener(provider)

    // start cross-checker if ever set
    this.startCrossChecker(crosscheckProvider)

    return this
  }

  startEventListener(provider: Providers) {
    if (provider instanceof RekuProviderManager) {
      provider.addContract(this.params.address, this.contract)
      provider.addListener(this.params.address, this.params.eventName, this.subscribeCallback)
    }
    else {
      const listener = this.contract.connect(provider)
      listener?.on(
        this.params.eventName,
        // TODO: calling this seems to be async, should we make it to sequential?
        this.subscribeCallback,
      )
    }
  }

  async startCrossChecker(provider?: Providers) {
    if (this.crosscheckerParams?.disabled)
      return

    if (!this.crosscheckerOptions)
      return
    if (!provider)
      throw new Error('crosscheckProvider is required in listen() when crosschecker is set')

    if (
      !(provider instanceof RekuProviderManager)
      && !(provider instanceof ethers.JsonRpcProvider)
      && !(provider instanceof ethers.WebSocketProvider)
    )
      throw new Error('crosscheckProvider must be an instance of RekuProviderManager or ethers.JsonRpcProvider or ethers.WebSocketProvider')
    this.crosschecker = new AutoCrossChecker(provider)
    this.crosschecker.start(this.crosscheckerOptions)
  }
}
