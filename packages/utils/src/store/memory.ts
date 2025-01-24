import { Keyv } from 'keyv'
import type { CacheableMemoryOptions } from 'cacheable'
import { KeyvCacheableMemory } from 'cacheable'

export type MemoryConfig = CacheableMemoryOptions & {
  namespace?: string
}

export function memoryStore(options?: MemoryConfig) {
  const store = new KeyvCacheableMemory(options)
  const keyv = new Keyv({ store }, { namespace: '' })
  return keyv
}
