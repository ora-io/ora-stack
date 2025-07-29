import type { EventFragment, Interface, InterfaceAbi, Log } from 'ethers'
import { ContractEventPayload, ContractUnknownEventPayload, ethers } from 'ethers'
import { AutoCrossChecker, ONE_MINUTE_MS, RekuProviderManager } from '@ora-io/reku'
import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { ContractAddress } from '@ora-io/utils'
import type { Signal } from './interface'

export interface EventSignalRegisterParams {
  address: ContractAddress | ContractAddress[]
  abi: Interface | InterfaceAbi
  eventName: string
  enableCrosscheck?: boolean // default: true
  enableSubscribe?: boolean // default: true
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
  params: EventSignalRegisterParams
  addresses: ContractAddress[]
  contractMap: Map<ContractAddress, ethers.BaseContract> = new Map()
  interface: ethers.Interface
  esig: string
  eventFragment: EventFragment

  subscribeCallback: EventSignalCallback
  crosscheckCallback: EventSignalCallback

  crosschecker?: AutoCrossChecker
  crosscheckerOptions?: AutoCrossCheckParam
  crosscheckerParams?: CrosscheckParams

  constructor(
    params: EventSignalRegisterParams,
    public callback: EventSignalCallback,
    crosscheckOptions?: CrosscheckOptions,
  ) {
    params = this._transformParams(params)
    this.params = params

    if (Array.isArray(params.address))
      this.addresses = params.address.map(this._getAddressStr)

    else this.addresses = [this._getAddressStr(params.address)]

    for (const address of this.addresses) {
      const contract = new ethers.Contract(address, params.abi)
      this.contractMap.set(address, contract)
    }

    // Get the event fragment by name
    const iface = ethers.Interface.from(params.abi)
    this.interface = iface
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
      const parsedLog = this.interface.decodeEventLog(this.eventFragment, log.data, log.topics)
      const payload = this._wrapContractEventPayload(log)
      await this.callback(...parsedLog, payload)
    }

    // set crosscheckOptions only when speicified
    if (crosscheckOptions)
      this._setCrosscheckOptions(crosscheckOptions)
  }

  private _transformParams(params: EventSignalRegisterParams) {
    if (params.enableCrosscheck === undefined)
      params.enableCrosscheck = true
    if (params.enableSubscribe === undefined)
      params.enableSubscribe = true
    return params
  }

  private _wrapContractEventPayload(log: Log) {
    const contract = this.contractMap.get(this._getAddressStr(log.address))
    if (!contract)
      throw new Error(`contract not found for address: ${log.address}`)
    if (this.eventFragment)
      return new ContractEventPayload(contract, this.subscribeCallback, this.params.eventName, this.eventFragment, log)
    return new ContractUnknownEventPayload(contract, this.subscribeCallback, this.params.eventName, log)
  }

  private _getAddressStr(address: ContractAddress) {
    if (typeof address === 'string')
      return ethers.getAddress(address)
    return address
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
    if (!this.params.enableSubscribe)
      return
    if (provider instanceof RekuProviderManager) {
      for (const address of this.addresses)
        provider.addContract(address, this.contractMap.get(address)!)
      for (const address of this.addresses)
        provider.addListener(address, this.params.eventName, this.subscribeCallback)
    }
    else {
      // const listener = this.contract.connect(provider)
      // listener?.on(
      //   this.params.eventName,
      //   // TODO: calling this seems to be async, should we make it to sequential?
      //   this.subscribeCallback,
      // )
      for (const address of this.addresses) {
        const newContract = this.contractMap.get(address)!.connect(provider)
        newContract.on(this.params.eventName, this.subscribeCallback)
        this.contractMap.set(address, newContract)
      }
    }
  }

  stop() {
    this.stopEventListener()
    this.stopCrossChecker()
  }

  stopEventListener() {
    if (this.provider instanceof RekuProviderManager)
      this.contractMap.forEach(contract => contract.removeAllListeners())

    else
      this.contractMap.forEach(contract => contract.off(this.params.eventName, this.subscribeCallback))
      // this.provider?.destroy()
  }

  stopCrossChecker() {
    this.crosschecker?.stop()
  }

  async startCrossChecker(provider?: Providers) {
    if (!this.params.enableCrosscheck)
      return

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
