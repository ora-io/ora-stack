import type { HandleFn } from '../flow'
import { getMiddlewareContext } from '../utils'

export const HandleFailedMiddleware: HandleFn = async (...args: any[]) => {
  const { next, task } = getMiddlewareContext(...args)

  try {
    await next()
  }
  catch (error) {
    await task.flow.failFn(task)
  }
}
