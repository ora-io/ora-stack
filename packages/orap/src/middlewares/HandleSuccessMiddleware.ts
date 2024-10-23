import type { HandleFn } from '../flow'
import { getMiddlewareContext } from '../utils'

export const HandleSuccessMiddleware: HandleFn = async (...args: any[]) => {
  const { next, task } = getMiddlewareContext(...args)
  await task.done()
  await task.remove()
  await task.flow.successFn(task)
  await next()
}
