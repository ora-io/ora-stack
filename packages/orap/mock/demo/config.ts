import { Logger } from '@ora-io/utils'

export const config = {
  MAINNET_USDT_ADDR: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  TRANSFER_EVENT_NAME: 'Transfer',
}

const logLevel = 'debug'
export const logger = new Logger(logLevel, '[demo]')
