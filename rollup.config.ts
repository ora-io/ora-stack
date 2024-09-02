import path from 'node:path'
import _esbuild from 'rollup-plugin-esbuild'
import { dts } from 'rollup-plugin-dts'
// import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import type { OutputOptions, RollupOptions } from 'rollup'
import { packages } from './scripts/constants'

const configs: RollupOptions[] = []
const plugins = [
  json(),
  commonjs(),
]
const esbuild = (_esbuild as any).default ?? _esbuild

const nodePlugins = [
  ...plugins,
  esbuild({
    target: 'node14',
  }),
]

const outputs = (dir: string): OutputOptions[] => [{
  dir: path.join(__dirname, `./packages/${dir}/dist`),
  format: 'esm',
  entryFileNames: '[name].mjs',
}, {
  dir: path.join(__dirname, `./packages/${dir}/dist`),
  format: 'cjs',
  entryFileNames: '[name].cjs',
}]

for (const pkg of packages) {
  const { dir, external } = pkg
  const input = path.join(__dirname, `./packages/${dir}/src/index.ts`)

  configs.push({
    external,
    treeshake: 'smallest',
    input,
    output: outputs(dir),
    plugins: [
      ...nodePlugins,
    ],
  })

  configs.push({
    input,
    output: {
      dir: path.join(__dirname, `./packages/${dir}/dist`),
      entryFileNames: '[name].d.ts',
      format: 'esm',
    },
    external,
    plugins: [
      dts({ respectExternal: true }),
    ],
  })
}

export default configs
