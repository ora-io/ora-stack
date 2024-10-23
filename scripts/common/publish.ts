import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'fs-extra'
import { consola } from 'consola'
import type { Package } from '../constants'
import { haveWorkspacePackages } from '../constants'
import { selectPkgs } from '../common'

export async function publish(pkgs?: Package[]) {
  let command = 'npm publish --access public'

  pkgs = pkgs ?? (await selectPkgs()).value as Package[]
  consola.log('Publishing packages:', pkgs.map(pkg => pkg.color(pkg.packName)).join(', '))

  for (const pkg of pkgs) {
    const { version } = fs.readJsonSync(path.join(process.cwd(), 'packages', pkg.dir, 'package.json'))

    if (version.includes('beta'))
      command += ' --tag beta'
    else if (version.includes('alpha'))
      command += ' --tag alpha'

    consola.info(`Publishing ${pkg.color(pkg.packName)} v${version}`)

    let cwd = path.join('packages', pkg.dir)
    if (haveWorkspacePackages.map(pkg => pkg.packName).includes(pkg.packName))
      cwd = path.join(cwd, 'dist')

    execSync(command, { stdio: 'inherit', cwd })
    consola.success(`Published ORA ${pkg.packName}`)
  }
}
