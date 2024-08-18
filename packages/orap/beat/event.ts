import type { Logger } from '@ora-io/utils'
import type { AutoCrossCheckParam, Providers } from '@ora-io/reku'
import type { EventSignalCallback, EventSignalRegisterParams } from '../signal'
import { EventSignal } from '../signal'

/**
 * Beat is Rap-lized, i.e. formalized in Orap framework, version of Signal
 * only Signals have corresponding Beat class, task & orap don't have
 */
export class EventBeat extends EventSignal {
  constructor(
    params: EventSignalRegisterParams,
    callback: EventSignalCallback,
    logger: Logger,
    _crosscheckOptions: Omit<AutoCrossCheckParam, 'address' | 'topics' | 'onMissingLog'> | undefined,
    private subscribeProvider: Providers,
    private crosscheckProvider: Providers | undefined,
  ) {
    super(params, callback, logger, _crosscheckOptions)
  }

  drop() {
    this.listen(this.subscribeProvider, this.crosscheckProvider)
  }
}
