import dotenv from 'dotenv'
import { RekuProviderManager } from '@ora-io/reku'
// import { sleep } from '@ora-io/utils'
import { startDemo } from '../examples/declarativeDemo/app'

dotenv.config({ path: './packages/orap/tests/.env' })

const chain = 'mainnet'

const wsProvider: RekuProviderManager = new RekuProviderManager(
  process.env[`${chain.toUpperCase()}_WSS`]!,
  {
    // heartbeatInterval: 100,
    disabledHeartbeat: true,
  },
)
const httpProvider: RekuProviderManager = new RekuProviderManager(
  process.env[`${chain.toUpperCase()}_HTTP`]!,
  {
    // heartbeatInterval: 500,
  },
)
const storeConfig = { port: parseInt(process.env.REDIS_PORT!), host: process.env.REDIS_HOST }

setTimeout(async () => {
  // for (let i = 0; i < 50; i++) {
  //   wsProvider.reconnect()
  //   await sleep(1000)
  // }
  // setInterval(() => {
  //   httpProvider.reconnect()
  // }, 2000)
}, 10000 * 2)

startDemo({ wsProvider, httpProvider }, storeConfig)
