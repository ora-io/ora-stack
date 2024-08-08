import type { Cache, Store } from 'cache-manager'
import { createCache, memoryStore } from 'cache-manager'
import type { RedisStore } from 'cache-manager-ioredis-yet'

export class SimpleStoreManager {
  private cache: Cache

  constructor(
    store?: Store,
  ) {
    if (store) {
      this.cache = createCache(store)
    }
    else {
      this.cache = createCache(memoryStore({
        max: 100,
        ttl: 10 * 1000 /* milliseconds */,
      }))
    }
  }

  get redisStore(): RedisStore {
    return <RedisStore> this.cache.store
  }

  async get<T>(key: string) {
    return await this.cache.get<T>(key)
  }

  async set(key: string, value: unknown) {
    await this.cache.set(key, value)
  }

  async del(key: string) {
    await this.cache.del(key)
  }

  async keys(pattern?: string): Promise<string[]> {
    return await this.cache.store.keys(pattern)
  }
}
