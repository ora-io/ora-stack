import type { ArgumentsFn } from '@murongg/utils'

export function composeFns<T>(handles: ArgumentsFn<T>[], args: Array<any> = []) {
  function dispatch(index: number) {
    if (index === handles.length)
      return Promise.resolve()

    const handle = handles[index]
    return Promise.resolve(handle(...args, () => dispatch(index + 1)))
  }

  return dispatch(0)
}
