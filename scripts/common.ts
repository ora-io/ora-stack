import prompts from 'prompts'
import { packages } from './constants'

export function selectPkgs() {
  return prompts({
    type: 'multiselect',
    name: 'value',
    message: 'Select packages to build',
    choices: packages.map(pkg => ({
      title: pkg.packName,
      value: pkg,
    })),
  })
}
