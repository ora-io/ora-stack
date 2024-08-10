import { execSync } from 'node:child_process'
import path from 'node:path'
import consola from 'consola'
import fs from 'fs-extra'
import fg from 'fast-glob'
import { haveWorkspacePackages, packages } from './constants'

const { version } = fs.readJSONSync('package.json')

const rootDir = path.resolve(__dirname, '..')

const FILES_COPY_LOCAL = [
  'README.md',
]

const FILES_COPY_DIST = [
  '*.cjs',
  '*.mjs',
  '*.d.ts',
]

async function build() {
  if (process.platform !== 'win32') {
    consola.info('Clean up')
    execSync('pnpm run clean', { stdio: 'inherit' })
  }

  execSync('pnpm run build:rollup', { stdio: 'inherit' })
  buildMetaFiles()
}

function copyFile(src: string, dest: string) {
  if (fs.existsSync(src))
    return fs.copyFile(src, dest)
}

async function buildMetaFiles() {
  for (const pkg of haveWorkspacePackages) {
    const packageRoot = path.resolve(rootDir, 'packages', pkg.dir)
    const packageDist = path.resolve(packageRoot, 'dist')

    await copyFile(path.join(packageRoot, 'README.md'), path.join(packageDist, 'README.md'))
    await copyFile(path.join(__dirname, '..', 'LICENSE'), path.join(packageDist, 'LICENSE'))

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
      if (packages.map(pkg => pkg.packName).includes(key))
        packageJSON.dependencies[key] = version
    }
    await fs.writeJSON(path.join(packageDist, 'package.json'), packageJSON, { spaces: 2 })
  }
}

build()
