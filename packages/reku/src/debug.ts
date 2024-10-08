import { debug as debugFn } from '@ora-io/utils'

export function debug(formatter: any, ...args: any[]) {
  return debugFn('reku')(formatter, ...args)
}
