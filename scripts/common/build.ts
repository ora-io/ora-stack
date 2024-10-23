import { execSync } from 'node:child_process'
import path from 'node:path'
import consola from 'consola'
import fs from 'fs-extra'
import fg from 'fast-glob'
import { intersection } from '@murongg/utils'
import type { Package } from '../constants'
import { haveWorkspacePackages, packages } from '../constants'

const rootDir = path.resolve(process.cwd())

const FILES_COPY_LOCAL = [
  'README.md',
]

const FILES_COPY_DIST = [
  '*.cjs',
  '*.mjs',
  '*.d.ts',
]

export function clean() {
  if (process.platform !== 'win32') {
    consola.info('Clean up')
    execSync('pnpm run clean', { stdio: 'inherit' })
  }
}

export async function build(pkgs?: Package[]) {
  pkgs = pkgs ?? packages as Package[]
  consola.log('Building packages:', pkgs.map(pkg => pkg.color(pkg.packName)).join(', '))
  pkgs = intersection(pkgs, haveWorkspacePackages)

  clean()

  execSync('pnpm run build:rollup', { stdio: 'inherit' })
  buildMetaFiles(pkgs)
}

function copyFile(src: string, dest: string) {
  if (fs.existsSync(src))
    return fs.copyFile(src, dest)
}

export async function buildMetaFiles(pkgs: Package[]) {
  consola.log('Building packages...')
  for (const pkg of pkgs) {
    consola.info(`Building ${pkg.color(pkg.packName)}`)
    const packageRoot = path.resolve(rootDir, 'packages', pkg.dir)
    const packageDist = path.resolve(packageRoot, 'dist')

    await copyFile(path.join(packageRoot, 'README.md'), path.join(packageDist, 'README.md'))
    await copyFile(path.join(process.cwd(), 'LICENSE'), path.join(packageDist, 'LICENSE'))

    const files = await fg(FILES_COPY_LOCAL, { cwd: packageRoot })

    for (const file of files)
      await fs.copyFile(path.join(packageRoot, file), path.join(packageDist, file))

    const distFiles = await fg(FILES_COPY_DIST, { cwd: packageDist })
    const distDir = path.join(packageDist, 'dist')
    if (!await fs.pathExists(distDir))
      await fs.mkdirp(distDir)

    for (const file of distFiles) {
      const oldFilePath = path.join(packageDist, file)
      await fs.copyFile(oldFilePath, path.join(distDir, file))
      // await fs.remove(oldFilePath)
    }

    const packageJSON = await fs.readJSON(path.join(packageRoot, 'package.json'))
    for (const key of Object.keys(packageJSON.dependencies || {})) {
      if (packages.map(pkg => pkg.packName).includes(key)) {
        // read version from package.json
        const pkg = packages.find(pkg => pkg.packName === key)
        if (pkg) {
          const pkgPath = path.join(rootDir, 'packages', pkg?.dir, 'package.json')
          packageJSON.dependencies[key] = fs.readJSONSync(pkgPath).version
        }
        else {
          throw new Error(`Package ${key} not found`)
        }
      }
    }
    await fs.writeJSON(path.join(packageDist, 'package.json'), packageJSON, { spaces: 2 })
    consola.success(`Built ${pkg.color(pkg.packName)}`)
  }
}

