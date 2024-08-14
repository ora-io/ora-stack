import type {
  Cluster,
  ClusterNode,
  ClusterOptions,
  RedisKey,
  RedisOptions,
} from 'ioredis'
import Redis from 'ioredis'

import * as telejson from 'telejson'

import type { Cache, Config, Store } from 'cache-manager'
import { isUndefined } from '@murongg/utils'

const stringify = (value: unknown) =>
  telejson.stringify({ v: value }, { maxDepth: Infinity }).slice(5, -1)

const parse = (value: string) => telejson.parse(`{"v":${value}}`)?.v

export type RedisCache = Cache<RedisStore>

export interface RedisStore extends Store {
  readonly isCacheable: (value: unknown) => boolean
  get client(): Redis | Cluster
}

const getVal = (value: unknown) => stringify(value)

export class NoCacheableError implements Error {
  name = 'NoCacheableError'
  constructor(public message: string) {}
}

export const avoidNoCacheable = async <T>(p: Promise<T>) => {
  try {
    return await p
  }
  catch (e) {
    if (!(e instanceof NoCacheableError))
      throw e
  }
}
function builder(
  redisCache: Redis | Cluster,
  basekey: RedisKey,
  reset: () => Promise<void>,
  keys: (pattern: string) => Promise<string[]>,
  options?: Config,
) {
  const isCacheable
    = options?.isCacheable || (value => value !== undefined && value !== null)

  return {
    async get<T>(key: string) {
      const val = await redisCache.hget(basekey, key)
      if (val === undefined || val === null)
        return undefined
      else return parse(val) as T
    },
    async set(key, value, ttl) {
      if (!isCacheable(value))
        throw new NoCacheableError(`"${value}" is not a cacheable value`)
      const t = ttl || options?.ttl
      if (!isUndefined(t) && t !== 0)
        await redisCache.hset(basekey, key, getVal(value), 'PX', t)
      else await redisCache.hset(basekey, key, getVal(value))
    },
    async mset(args, ttl) {
      const t = ttl || options?.ttl
      if (!isUndefined(t) && t !== 0) {
        const multi = redisCache.multi()
        for (const [key, value] of args) {
          if (!isCacheable(value)) {
            throw new NoCacheableError(
              `"${getVal(value)}" is not a cacheable value`,
            )
          }
          multi.hset(basekey, key, getVal(value), 'PX', t)
        }
        await multi.exec()
      }
      else {
        await redisCache.hmset(
          basekey,
          args.flatMap(([key, value]) => {
            if (!isCacheable(value))
              throw new Error(`"${getVal(value)}" is not a cacheable value`)
            return [key, getVal(value)] as [string, string]
          }),
        )
      }
    },
    mget: (...args) =>
      redisCache
        .hmget(basekey, ...args)
        .then(x =>
          x.map(x =>
            x === null || x === undefined ? undefined : (parse(x) as unknown),
          ),
        ),
    async mdel(...args) {
      await redisCache.hdel(basekey, ...args)
    },
    async del(key) {
      await redisCache.hdel(basekey, key)
    },
    ttl: async key => redisCache.pttl(`${basekey}:${key}`),
    keys: (pattern = '*') => keys(pattern),
    reset,
    isCacheable,
    get client() {
      return redisCache
    },
  } as RedisStore
}

export interface RedisClusterConfig {
  nodes: ClusterNode[]
  options?: ClusterOptions
}

export type RedisHashStoreOptions = (RedisOptions | { clusterConfig: RedisClusterConfig }) & Config

export async function redisHashStore(
  key: RedisKey,
  options?: RedisHashStoreOptions,
) {
  options ||= {}
  const redisCache
    = 'clusterConfig' in options
      ? new Redis.Cluster(
        options.clusterConfig.nodes,
        options.clusterConfig.options,
      )
      : new Redis(options)

  return redisInsStore(redisCache, key, options)
}

export function redisInsStore(redisCache: Redis | Cluster, key: RedisKey, options?: Config) {
  const reset = async () => {
    await redisCache.hdel(key)
  }
  const keys = (pattern: string) => redisCache.hkeys(pattern)

  return builder(redisCache, key, reset, keys, options)
}
