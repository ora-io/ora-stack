
<p align="center">
  <a href="https://www.ora.io" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://raw.githubusercontent.com/ora-io/media-kit/f0595ccc0b2c867614379c009de1fa81db794db5/Logo/logo_type_blue_solid.svg" alt="HyperOracle logo">
  </a>
</p>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/@ora-io/orap"><img src="https://img.shields.io/npm/v/@ora-io/orap/latest.svg" alt="npm package"></a>
  <a href="https://www.npmjs.com/package/@ora-io/orap"><img src="https://img.shields.io/npm/d18m/%40ora-io%2Forap" alt="build status"></a>
  <a href="https://www.npmjs.com/package/@ora-io/orap"><img src="https://img.shields.io/npm/l/%40ora-io%2Forap" alt="build status"></a>
</p>

# ORA STACK

## What is ORA STACK
ORA Stack is a comprehensive framework designed for quickly setting up a robust web3 Oracle Service.

It incorporates multiple frameworks and libraries, covering both the On-chain contract and Off-chain backend parts.

## [ORAP](./packages/orap/)
<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/main/assets/orap.logo.png?raw=true" alt="Orap Icon" width="200"/></div>

The declarative signal-based backend framework for building the backend of oracle services, handy to use out of the box.

It's similar to a web3 version of *expressjs*, writing event listeners just as **easy** as writing http routes. 

For web3 developers, ORAP can be viewed as a **robust** event listener framework (since it's based on REKU) that can be used to build any backend services that require listening to on-chain events.

## [REKU](./packages/reku/)
<div align="center"><img src="https://github.com/ora-io/ora-stack/blob/main/assets/reku.logo.png?raw=true" alt="Reku Icon" width="200"  /></div>

A reliable backend ethereum toolkit and utils, including a reliable RekuProviderManager that deals with websocket reconnections, and the event cross-checker that integrates the real-time-yet-unstable event subscription and stable-yet-latency getLogs.

## [Utils](./packages/utils/)
the common swiss-knife package for oracle backend developments.

## [UAO](https://github.com/ora-io/UAO)
<div align="center"><img src="https://github.com/ora-io/UAO/blob/assets/assets/UAO%20Arch.png?raw=true" alt="UAO" width="600"/></div>
The contract library for developing the on-chain part of the Async-style Oracle in Solidity.

## Template License

[MIT](./LICENSE) License © 2022 [ORA Protocol](https://ora.io)
