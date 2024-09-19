import type { ArgumentsFn } from '@ora-io/utils'

export interface Verse<T = any> {
  /**
   * play the verse: means lauch a processor to fetch and handle the flow defined jobs
   */
  play: ArgumentsFn<T>
}
