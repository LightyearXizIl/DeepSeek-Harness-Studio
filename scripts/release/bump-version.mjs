// Bump the desktop package version in package.json and package-lock.json.
// Usage: node bump-version.mjs <x.y.z> [desktopDir]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('usage: node bump-version.mjs <x.y.z> [desktopDir]')
  process.exit(1)
}
const dir = process.argv[3] ?? process.cwd()
const pkgPath = join(dir, 'package.json')
const lockPath = join(dir, 'package-lock.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.version = version
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`package.json -> ${version}`)

const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
lock.version = version
if (lock.packages?.['']?.version !== undefined) lock.packages[''].version = version
writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
console.log(`package-lock.json -> ${version}`)
