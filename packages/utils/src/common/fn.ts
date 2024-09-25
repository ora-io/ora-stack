import type { ArgumentsFn } from '@murongg/utils'

export function composeFns<T>(...beforeNextArgs: Array<any>) {
  return (handles: ArgumentsFn<T>[], args: Array<any> = []) => {
    function dispatch(index: number, ...childArgs: Array<any>) {
      if (index === handles.length)
        return Promise.resolve()

      const realArgs = childArgs.length ? childArgs : args

      const handle = handles[index]
      return Promise.resolve(handle(...realArgs, ...beforeNextArgs, (...args: Array<any>) => dispatch(index + 1, ...args)))
    }

    return dispatch(0, ...args)
  }
}
