import type { Verse } from '../verse/interface'

export interface Flow {
  /**
   * assemble() always return a Verse class, with a play function as for "launch processor"
   * */
  assemble(): Verse
}
