import type { Constructor } from '@ora-io/utils'
import { TaskStorable } from '../../index'
import { logger } from './config'

export class TransferTask extends TaskStorable {
  static readonly taskPrefix: string = 'ora-stack:orap:demo:TransferTask:'
  static readonly taskPrefixDone: string = 'ora-stack:orap:demo:Done-TransferTask:'

  constructor(
    public id?: string,
    public from?: string,
    public to?: string,
    public amount?: number,
  ) { super() }

  toKey(): string {
    if (!this.id)
      throw new Error('uninitialized')
    return this.id.toString()
  }

  async handle() {
    // TODO
    logger.log('[+] handleTask', this.toString())
  }

  /** ***************** overwrite samples **************/

  async save(sm: any) {
    logger.log('[*] save task', this.toString())
    await super.save(sm)
  }

  static async load<T extends TaskStorable>(this: Constructor<T>, sm: any): Promise<T> {
    const task = await (this as any)._load(sm)
    logger.log('[*] load task', task.toKey())
    return task
  }

  async done(sm: any) {
    logger.log('[*] done task', this.toKey())
    await super.done(sm)
  }

  async remove(sm: any) {
    logger.log('[*] remove task', this.toKey())
    await super.remove(sm)
  }
}
