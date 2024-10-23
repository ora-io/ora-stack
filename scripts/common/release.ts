import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'fs-extra'
import consola from 'consola'
import type { Package } from '../constants'
import { selectPkgs } from '../common'
import { buildMetaFiles, clean } from './build'
import { publish } from './publish'

export async function release() {
  const pkgs = (await selectPkgs()).value as Package[]
  consola.log('Releasing packages:', pkgs.map(pkg => pkg.color(pkg.packName)).join(', '))

  clean()
  execSync('pnpm run build:rollup', { stdio: 'inherit' })

  const includeMain = pkgs.some(pkg => pkg.isMain)
  let mainVersion: string | undefined

  for (const pkg of pkgs) {
    const rootDir = path.resolve(process.cwd(), 'packages', pkg.dir)
    const packageJSONPath = path.join(rootDir, 'package.json')
    const { version: oldVersion } = fs.readJSONSync(packageJSONPath)

    consola.log('Start releasing ', pkg.color(pkg.packName))
    execSync('bumpp --no-commit --no-tag --no-push --print-commits', { stdio: 'inherit', cwd: rootDir })

    const { version } = fs.readJSONSync(packageJSONPath)

    if (oldVersion === version) {
      console.log('canceled')
      process.exit()
    }
    await buildMetaFiles([pkg])
    consola.log('Releasing', pkg.color(pkg.packName), `v${version}`)

    if (pkg.isMain) {
      mainVersion = version
    }
    else if (!includeMain) {
      execSync('git add .', { stdio: 'inherit', cwd: rootDir })
      execSync(`git commit -m "chore: release v${version}"`, { stdio: 'inherit', cwd: rootDir })
    }
  }

  if (includeMain && mainVersion) {
    consola.log('Releasing main package', mainVersion)
    const packageRoot = path.resolve(process.cwd())
    const packageJSON = await fs.readJSON(path.join(packageRoot, 'package.json'))
    packageJSON.version = mainVersion
    await fs.writeJSON(path.join(packageRoot, 'package.json'), packageJSON, { spaces: 2 })
    execSync('git add .', { stdio: 'inherit' })
    execSync(`git commit -m "chore: release v${mainVersion}"`, { stdio: 'inherit' })
    execSync(`git tag -a v${mainVersion} -m "v${mainVersion}"`, { stdio: 'inherit' })

    execSync('git push', { stdio: 'inherit' })
    execSync('git push --tags', { stdio: 'inherit' })
  }

  await publish(pkgs)
}

