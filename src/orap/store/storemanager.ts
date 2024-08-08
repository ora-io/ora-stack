/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { retryOnRet, Store, SimpleStoreManager } from "../../utils";

export class StoreManager extends SimpleStoreManager {
  queryDelay: number

  constructor(
    store?: Store, options?: {queryDelay?: number}
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
      return retryOnRet(_keys, async (rst) => {
        return rst && (await rst).length > 0
      }, { delay: this.queryDelay });
    } else {
      return _keys()
    }
  }
}
