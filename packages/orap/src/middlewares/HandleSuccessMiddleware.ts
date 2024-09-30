import type { HandleFn } from '../flow'
import { getTaskContext } from '../utils'

export const HandleSuccessMiddleware: HandleFn = async (...args: any[]) => {
  const { next, task } = getTaskContext(...args)
  await task.done()
  await task.remove()
  await task.flow.successFn(task)
  await next()
}
