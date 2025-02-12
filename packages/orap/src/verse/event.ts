import { EventBeat } from '../beat/event'
import type { EventFlow } from '../flow/event'
import type { Verse } from './interface'
import type { TaskVerse } from './task'

export class EventVerse implements Verse {
  private taskVerses: TaskVerse[] = []
  private eventBeat: EventBeat | undefined

  constructor(private flow: EventFlow) { }

  // TODO: can rm if constructor works
  // new from flow
  // _from(flow: EventFlow): EventVerse {
  //   const flowIns = new EventVerse(); // Create B instance
  //   Object.assign(flowIns, flow); // Copy all properties from A to B
  //   return flowIns;
  // }

  async _createTasks(...args: Array<any>) {
    // TODO: sequential or async?
    for (const verse of this.taskVerses)
      await verse.createTask(...args)
  }

  async handleSignal(...args: Array<any>) {
    const isContinue = await this.flow.handleFn(...args)
    if (!isContinue)
      return

    await this._createTasks(...args) // not include the last ContactEventPayload obj
  }

  play() {
    this._playTaskVerses()
    this._play()
  }

  stop() {
    this.eventBeat?.stop()
    for (const task of this.taskVerses)
      task.stop()
  }

  setTaskVerses(taskVerses: TaskVerse[]) {
    this.taskVerses = taskVerses
    return this
  }

  private _playTaskVerses() {
    for (const verse of this.taskVerses)
      verse.play() // no await, off it goes
  }

  private _play() {
    // create an beat per verse
    const eventBeat = new EventBeat(
      // for create signal
      this.flow.params!,
      this.handleSignal.bind(this),
      this.flow.partialCrosscheckOptions,
      // for listen
      this.flow.subscribeProvider!,
      this.flow.crosscheckProvider,
    )
    eventBeat.drop()
    this.eventBeat = eventBeat
    // this.eventSignal = new EventSignal(
    //   this.flow.params!,
    //   this.handleSignal,
    //   this.flow.logger,
    //   this.flow.partialCrosscheckOptions,
    // )
  }
}
