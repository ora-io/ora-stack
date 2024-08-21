import assert from 'assert'

export function stripPrefix(key: string, prefix: string, soft = false) {
  if (!soft)
    assert(key.startsWith(prefix))
  return key.slice(prefix.length)
}
