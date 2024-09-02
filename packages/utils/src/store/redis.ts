import type { RedisOptions } from 'ioredis'
import { Redis } from 'ioredis'
import type { Config } from 'cache-manager'
import { RedisClusterConfig, redisInsStore } from 'cache-manager-ioredis-yet'

export function redisStore(
  options?: (RedisOptions | { clusterConfig: RedisClusterConfig }) & Config,
) {
  options ||= {}
  const redisCache
    = 'clusterConfig' in options
      ? new Redis.Cluster(
        options.clusterConfig.nodes,
        options.clusterConfig.options,
      )
      : new Redis(options)

  return redisInsStore(redisCache, options)
}

export {
  RedisClusterConfig,
  redisInsStore,
}
