/* eslint-disable no-console */
import debugFn from 'debug'

export function debug(workspace: string) {
  const d = debugFn(`DEBUG:ora-stack:${workspace}`)
  d.log = (...args: any[]) => {
    console.log(...args)
  }
  return d
}
