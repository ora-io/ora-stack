import dotenv from 'dotenv'
import { ethers } from 'ethers'
import { describe, it, vi } from 'vitest'
import { sleep } from '@ora-io/utils'
import { startDemo } from '../mock/demo/app'

dotenv.config({ path: './packages/orap/tests/.env' })

const chain = 'mainnet'

const wsProvider = new ethers.WebSocketProvider(
  process.env[`${chain.toUpperCase()}_WSS`]!,
)
const httpProvider = new ethers.JsonRpcProvider(
  process.env[`${chain.toUpperCase()}_HTTP`]!,
)

describe('Orap', () => {
  it('should run demo without errors', async () => {
    const consoleSpy = vi.spyOn(console, 'log')

    const storeConfig = { port: parseInt(process.env.REDIS_PORT!), host: process.env.REDIS_HOST }

    startDemo({ wsProvider, httpProvider }, storeConfig)
    // await expect().resolves.not.toThrow()

    // Optionally, you can check if specific logs were called
    // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("onMissingLog"));
    await sleep(1000000)
    consoleSpy.mockRestore()
  }, {
    timeout: 100000000,
  })
})
