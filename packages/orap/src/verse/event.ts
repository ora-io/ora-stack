import { EventBeat } from '../beat/event'
import type { EventFlow } from '../flow/event'
import type { Verse } from './interface'
import type { TaskVerse } from './task'

type HandleFn = (...args: any[]) => any

export class EventVerse implements Verse {
  private taskVerses: TaskVerse[] = []

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
    const handles: HandleFn[] = []
    for (const verse of this.taskVerses)
      handles.push(verse.createTask.bind(verse))
    this.compose(handles, ...args)
  }

  compose(handles: HandleFn[], ...args: Array<any>) {
    function dispatch(index: number) {
      if (index === handles.length)
        return Promise.resolve()

      const handle = handles[index]
      return Promise.resolve(handle(...args, () => dispatch(index + 1)))
    }

    return dispatch(0)
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

  setTaskVerses(taskVerses: TaskVerse[]) {
    this.taskVerses = taskVerses
    return this
  }

  private _playTaskVerses() {
    const handles: HandleFn[] = []
    for (const verse of this.taskVerses)
      handles.push(verse.play.bind(verse))
    this.compose(handles)
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

    // this.eventSignal = new EventSignal(
    //   this.flow.params!,
    //   this.handleSignal,
    //   this.flow.logger,
    //   this.flow.partialCrosscheckOptions,
    // )
  }
}
