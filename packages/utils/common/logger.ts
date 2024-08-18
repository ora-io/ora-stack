/* eslint no-console: 0 */
import colors from 'picocolors'

export type LogType = 'error' | 'warn' | 'info' | 'debug'
export type LogLevel = LogType | 'silent'

export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

export class Logger {
  level: LogLevel = 'info'
  prefix: string
  thresh = LogLevels[this.level]

  timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  private writeCache: string[] = []

  private tagMap: Record<LogType, string>

  constructor(level: LogLevel = 'debug', prefix = '') {
    this.level = level
    this.prefix = prefix
    this.thresh = LogLevels[this.level]
    this.tagMap = {
      error: colors.red(colors.bold(this.prefix)),
      warn: colors.yellow(colors.bold(this.prefix)),
      info: colors.cyan(colors.bold(this.prefix)),
      debug: colors.gray(colors.bold(this.prefix)),
    }
  }

  output(type: LogType, msg: string) {
    if (this.thresh >= LogLevels[type]) {
      const method = type === 'info' ? 'log' : type
      const format = () => {
        const tag = this.tagMap[type]
        return `${colors.dim(this.timeFormatter.format(new Date()))} ${tag} ${msg}`
      }
      console[method](format())
    }
  }

  info(...args: any[]): void {
    this.output('info', args.join(' '))
  }

  warn(...args: any[]): void {
    this.output('warn', args.join(' '))
  }

  error(...args: any[]): void {
    this.output('error', args.join(' '))
  }

  debug(...args: any[]): void {
    this.output('debug', args.join(' '))
  }

  log(...args: any[]): void {
    this.info(...args)
  }

  write(msg: string) {
    if (msg === '\n') {
      this.debug(this.writeCache.join(''))
      this.writeCache = []
    }
    else {
      this.writeCache.push(msg)
    }
  }
}

// eslint-disable-next-line import/no-mutable-exports
export let logger = new Logger()

export function setLogger(_logger: Logger) {
  logger = _logger
}
