import type { NextFunction } from './flow'
import { TaskRaplized } from './task'

function checkIsTaskRaplized(task: any): task is TaskRaplized {
  return task instanceof TaskRaplized
}

export function getTaskContext(...args: any[]) {
  if (args.length && Array.isArray(args[0])) {
    const newArgs = args[0]
    const next = newArgs.at(-1) as NextFunction
    const task = newArgs.at(-2) as TaskRaplized
    const isTaskRaplized = checkIsTaskRaplized(task)

    if (typeof next === 'function' && isTaskRaplized) {
      return {
        next,
        task,
      }
    }
  }

  const next = args.at(-1) as NextFunction
  const task = args.at(-2) as TaskRaplized
  const isTaskRaplized = checkIsTaskRaplized(task)

  if (typeof next !== 'function' || !isTaskRaplized)
    throw new Error('Invalid arguments')

  return {
    next,
    task,
  }
}
