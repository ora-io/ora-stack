import type { Cache, CreateCacheOptions } from 'cache-manager'
import { createCache } from 'cache-manager'
import type { KeyvStoreAdapter } from 'keyv'
import { Keyv } from 'keyv'
import { KeyvCacheableMemory } from 'cacheable'

export class SimpleStoreManager {
  private cache: Cache
  private store: Keyv

  constructor(
    options?: (Omit<CreateCacheOptions, 'stores'>) & { store: Keyv },
  ) {
    if (options) {
      this.cache = createCache({
        ...options,
        stores: [
          options.store,
        ],
      })
      this.store = options.store
    }
    else {
      const store = new KeyvCacheableMemory({ ttl: 10 * 1000, lruSize: 100 })
      const keyv = new Keyv({ store })
      this.store = keyv
      this.cache = createCache({ stores: [keyv] })
    }
  }

  get redisStore(): KeyvStoreAdapter {
    return this.store.store
  }

  async get<T>(key: string) {
    return await this.cache.get<T>(key)
  }

  async set(key: string, value: unknown, ttl?: number) {
    await this.cache.set(key, value, ttl)
  }

  async del(key: string) {
    await this.cache.del(key)
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = []
    for await (const [key] of this.store.store.entries()) {
      if (pattern) {
        const regex = new RegExp(`(?<!.)${pattern}`)
        if (regex.test(key))
          keys.push(key)
      }
      else {
        keys.push(key)
      }
    }
    return keys
  }

  async has(key: string): Promise<boolean> {
    return !!await this.cache.get(key)
  }

  async getAll<T>(): Promise<T[]> {
    const values = []
    for await (const [, value] of this.store.store.entries())
      values.push(value)
    return values
  }
}
