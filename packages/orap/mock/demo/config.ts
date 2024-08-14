import { Logger } from '@ora-io/utils'

export const config = {
  MAINNET_USDT_ADDR: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  TRANSFER_EVENT_NAME: 'Transfer',
  TASK_TTL: 60000,
  TASK_DONE_TTL: 60000,
  CROSSCHECKER_CACHE_TTL: 60000,
}

const logLevel = 'debug'
export const logger = new Logger(logLevel, '[orap-mock-demo]')
