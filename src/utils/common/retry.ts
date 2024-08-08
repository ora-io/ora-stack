/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Awaitable, Fn, polling, retry } from '@murongg/utils'

export interface RetryOptions {
  retryMax?: number,
  delay?: number,
}

// todo: if no retryMax, use polling
export async function retryOnRet<T extends Fn<any>>(fn: T, successCondition: (result: ReturnType<T>) => Awaitable<boolean>, options: RetryOptions = {}) {
  const { retryMax, delay = 1000 } = options;
  const errMsgRetNull = 'Returned value doesn\'t meet success condition'
  if (!retryMax) {
    let result: any;
    const success = await polling(async () => {
      result = await fn()
      // console.log("in retryOnNull-polling", successCondition(result))
      return await successCondition(result); // retry on false
    }, delay) // not passing retryMax to use MAX by default
    if (success) return result;
    else throw new Error("Polling failed after exhausting retries")
  } else {
    return await retry(async () => {
      const result = await fn()
      if (!await successCondition(result)) throw new Error(errMsgRetNull);
      return result;
    }, (err: Error) => { return err.message == errMsgRetNull }, retryMax, {
      delay,
    })
  }
}

export const retryOnNull = async<T extends Fn<any>>(fn: T, options: RetryOptions = {}) => retryOnRet(fn, (ret: any) => !!ret, options)
