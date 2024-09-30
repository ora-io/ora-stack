import { ContractEventPayload } from 'ethers'
import type { Providers } from '@ora-io/reku'
import { getTaskContext } from '../utils'

export const CheckTransactionStatus = (provider: Providers) => {
  if (!provider)
    throw new Error('provider is required')

  return async (...args: any[]) => {
    const { next } = getTaskContext(...args)
    const contractEventPayload = args.at(-3) as ContractEventPayload
    if (contractEventPayload instanceof ContractEventPayload) {
      const tx = await provider.provider.getTransactionReceipt(contractEventPayload.log.transactionHash)
      if (!tx || tx?.status === 0)
        throw new Error('Transaction failed')
      await next()
    }
    else {
      throw new TypeError('Invalid contract event payload')
    }
  }
}
