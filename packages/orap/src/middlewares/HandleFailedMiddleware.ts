import type { HandleFn } from '../flow'
import { getTaskContext } from '../utils'

export const HandleFailedMiddleware: HandleFn = async (...args: any[]) => {
  const { next, task } = getTaskContext(...args)

  try {
    await next()
  }
  catch (error) {
    await task.remove()
    await task.flow.failFn(task)
  }
}
