import type { Store } from '@ora-io/utils'
import { SimpleStoreManager, retryOnRet } from '@ora-io/utils'

export class StoreManager extends SimpleStoreManager {
  queryDelay: number

  constructor(
    store?: Store, options?: { queryDelay?: number },
  ) {
    super(store)
    this.queryDelay = options?.queryDelay ?? 3000
  }

  async keys(pattern?: string, isWait = false): Promise<string[]> {
    const _keys = () => {
      // console.log('[cache] _keys wait non-null')
      return super.keys(pattern)
    }
    if (isWait) {
      return retryOnRet(_keys, async (rst: any) => {
        return rst && (await rst).length > 0
      }, { delay: this.queryDelay })
    }
    else {
      return _keys()
    }
  }
}
