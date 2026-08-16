import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'icon.png')
const lightSource = path.join(projectRoot, 'build', 'logo-light.png')
const darkSource = path.join(projectRoot, 'build', 'logo-dark.png')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'deepseek-harness-studio-logo.png')
const lightDestination = path.join(destinationDirectory, 'deepseek-harness-studio-logo-light.png')
const darkDestination = path.join(destinationDirectory, 'deepseek-harness-studio-logo-dark.png')
const indexPath = path.join(destinationDirectory, 'index.html')
const manifestPath = path.join(destinationDirectory, 'manifest.webmanifest')

function replaceRequired(contents, search, replacement, file) {
  if (contents.includes(replacement)) return contents
  if (!contents.includes(search)) {
    throw new Error(`Could not update DeepSeek Harness Studio branding in ${file}: expected content was not found`)
  }
  return contents.replace(search, replacement)
}

await mkdir(destinationDirectory, { recursive: true })
await copyFile(source, destination)
await copyFile(lightSource, lightDestination)
await copyFile(darkSource, darkDestination)

const index = await readFile(indexPath, 'utf8')
await writeFile(
  indexPath,
  replaceRequired(
    index,
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="icon" type="image/png" href="/deepseek-harness-studio-logo.png" />',
    path.relative(projectRoot, indexPath)
  )
)

const manifest = await readFile(manifestPath, 'utf8')
await writeFile(
  manifestPath,
  replaceRequired(
    manifest,
    '"src": "/favicon.svg",\n      "sizes": "any",\n      "type": "image/svg+xml"',
    '"src": "/deepseek-harness-studio-logo.png",\n      "sizes": "1254x1254",\n      "type": "image/png"',
    path.relative(projectRoot, manifestPath)
  )
)

console.log(`Installed DeepSeek Harness Studio brand assets: ${[
  destination,
  lightDestination,
  darkDestination
].map((file) => path.relative(projectRoot, file)).join(', ')}`)
