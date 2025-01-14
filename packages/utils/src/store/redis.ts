import type { KeyvRedisOptions, RedisClientConnectionType, RedisClientOptions, RedisClusterOptions } from '@keyv/redis'
import KeyvRedis, { Keyv } from '@keyv/redis'

export interface RedisConnect {
  host?: string
  port?: number
  username?: string
  password?: string
  db?: number
}

export function redisStore(
  connect?: string | RedisClientOptions | RedisClusterOptions | RedisClientConnectionType | RedisConnect,
  options?: KeyvRedisOptions,
) {
  if (typeof connect === 'object' && connect) {
    if (Reflect.get(connect, 'host')) {
      const c = connect as RedisConnect
      let connectStr = 'redis://'
      if (c.username)
        connectStr += `${c.username}:${c.password}@`
      connectStr += `${c.host}:${c.port}`
      if (c.db)
        connectStr += `/${c.db}`
      connect = connectStr
    }
  }

  const keyv = new Keyv(new KeyvRedis(connect, options), {
    namespace: '',
  })
  return keyv
}
