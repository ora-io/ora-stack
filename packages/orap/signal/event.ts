import type { EventFragment, Log } from 'ethers'
import { ethers } from 'ethers'
import { AutoCrossChecker, ONE_MINUTE_MS } from '@ora-io/rek'
import type { AutoCrossCheckParam } from '@ora-io/rek'
import type { Signal } from './type'

export interface EventSignalRegisterParams {
  address: string
  abi: any
  eventName: string
  // esig?: string,
}

export type EventSignalCallback = ethers.Listener

export class EventSignal implements Signal {
  provider?: ethers.JsonRpcProvider | ethers.WebSocketProvider
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
      await this.callback(...args, _contractEventPayload.log)
    }
    // to align with subscribe listener, parse event params and add EventLog to the last
    this.crosscheckCallback = async (log: Log) => {
      const parsedLog = this.contract.interface.decodeEventLog(this.eventFragment, log.data, log.topics)
      await this.callback(...parsedLog, log)
    }
  }

  // TODO: how to integrate crosschecker
  // TODO: should be wsProvider only?
  listen(provider: ethers.WebSocketProvider, crosscheckProvider?: ethers.JsonRpcProvider) {
    this.provider = provider

    // start event listener
    const listener = this.contract.connect(provider)
    listener?.on(
      this.params.eventName,
      // TODO: calling this seems to be async, should we make it to sequential?
      this.subscribeCallback,
    )

    // start cross-checker if ever set
    if (this.crosscheckerOptions) {
      if (!crosscheckProvider)
        throw new Error('crosschecker set, please provide crosscheckProvider to listen function')
      this.startCrossChecker(crosscheckProvider)
    }

    return this
  }

  async startCrossChecker(provider: ethers.JsonRpcProvider) {
    if (!this.crosscheckerOptions)
      throw new Error('no crosscheck set, can\'t start crosschecker')
    this.crosschecker = new AutoCrossChecker(provider, this.crosscheckerOptions)
    await this.crosschecker.start(this.crosscheckerOptions)
  }

  // TODO: hide address & topics & onMissingLog from interface AutoCrossCheckParam
  crosscheck(options?: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'>) {
    const {
      intervalMsMin = ONE_MINUTE_MS * 60,
      ignoreLogs = [],
    } = options ?? {}
    // save crosschecker param
    this.crosscheckerOptions = {
      ...options,
      address: this.params.address,
      topics: [this.esig],
      onMissingLog: this.crosscheckCallback,
      intervalMsMin,
      ignoreLogs,
    }
    return this
  }
}
