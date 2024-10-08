import debugFn from 'debug'

export function debug(workspace: string) {
  return debugFn(`ora-stack:${workspace}`)
}
