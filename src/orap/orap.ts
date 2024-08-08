/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { EventSignal } from "./signal/event";

export interface ListenOptions {
  wsProvider: ethers.WebSocketProvider
  httpProvider?: ethers.JsonRpcProvider
}

export class Orap {
    routes: {
      event: EventSignal[]
    }

    constructor() {
      this.routes = {
        event: []
      }
    }

    event(options: any, fn: any) {
      const es = new EventSignal(options, fn)
      this.routes.event.push(es)
      return es
    }

    _listenChain(wsProvider: ethers.WebSocketProvider, httpProvider?: ethers.JsonRpcProvider) {
      this.routes.event.forEach(es => es.listen(wsProvider, httpProvider));
    }

    listen(options: ListenOptions, onListen: any = ()=>{}) {
      this._listenChain(options.wsProvider, options.httpProvider);
      onListen();
      return this;
    }
}
