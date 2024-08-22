import type { EventFragment, Interface, InterfaceAbi, Log } from 'ethers'
import { ethers } from 'ethers'
import { AutoCrossChecker, ONE_MINUTE_MS, RekuProviderManager } from '@ora-io/reku'
import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { Logger } from '@ora-io/utils'
import type { Signal } from './interface'

export interface EventSignalRegisterParams {
  address: string
  abi: Interface | InterfaceAbi
  eventName: string
  // esig?: string,
}

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

  constructor(
    public params: EventSignalRegisterParams,
    public callback: EventSignalCallback,
    public logger: Logger,
    crosscheckOptions?: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>,
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

    // set crosscheckOptions only when speicified
    if (crosscheckOptions)
      this._setCrosscheckOptions(crosscheckOptions)

    // to align with crosschecker onMissing, parse the last arg from ContractEventPayload to EventLog
    this.subscribeCallback = async (...args: Array<any>) => {
      const _contractEventPayload = args.pop()
      await this.callback(...args, _contractEventPayload.log)
      await this.crosschecker?.cache!.addLog(_contractEventPayload.log)
    }
    // to align with subscribe listener, parse event params and add EventLog to the last
    this.crosscheckCallback = async (log: Log) => {
      const parsedLog = this.contract.interface.decodeEventLog(this.eventFragment, log.data, log.topics)
      this.logger.info('crosschecker capture a missing event! processing...', log.transactionHash, log.index)
      await this.callback(...parsedLog, log)
    }
  }

  private _setCrosscheckOptions(options: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>) {
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
    if (!this.crosscheckerOptions)
      return

    if (!provider)
      throw new Error('crosscheckProvider is required in listen() when crosschecker is set')

    this.crosschecker = new AutoCrossChecker(provider)
    this.crosschecker.setLogger(this.logger)
    await this.crosschecker.start(this.crosscheckerOptions)
  }
}
