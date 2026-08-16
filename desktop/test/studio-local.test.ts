import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import YAML from 'yaml'
import { ensureStudioThemeInstalled, mergedPatchPath } from '../src/main/studio-local'

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'studio-local-test-'))
}

describe('mergedPatchPath', () => {
  it('merges the official and local patches into one YAML list', async () => {
    const dir = await makeTempDir()
    try {
      const official = join(dir, 'official.yml')
      const local = join(dir, 'local.yml')
      const userData = join(dir, 'userData')
      await mkdir(userData, { recursive: true })
      await writeFile(official, '- id: directory-picker\n  disabled: true\n')
      await writeFile(
        local,
        '- insert:\n    - id: ui-aqua\n      name: \'@deepseek-ai/dsh-client-ui-aqua\'\n'
      )

      const merged = mergedPatchPath(official, local, userData)
      expect(merged).toBe(join(userData, 'deepseek-harness-studio.merged.patch.yml'))

      const parsed = YAML.parse(await readFile(merged, 'utf8')) as Array<Record<string, unknown>>
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({ id: 'directory-picker', disabled: true })
      expect(parsed[1]).toHaveProperty('insert')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('falls back to the official patch when the local one is missing', async () => {
    const dir = await makeTempDir()
    try {
      const official = join(dir, 'official.yml')
      const missing = join(dir, 'missing.yml')
      const userData = join(dir, 'userData')
      await mkdir(userData, { recursive: true })
      await writeFile(official, '- id: directory-picker\n  disabled: true\n')

      expect(mergedPatchPath(official, missing, userData)).toBe(official)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('ensureStudioThemeInstalled', () => {
  it('copies the vendored theme into the Harness plugin directory', async () => {
    const dir = await makeTempDir()
    try {
      const dshHome = join(dir, 'dshHome')
      const source = join(dir, 'theme-source')
      await mkdir(join(source, 'lib'), { recursive: true })
      await writeFile(join(source, 'package.json'), JSON.stringify({ version: '1.2.3' }))
      await writeFile(join(source, 'lib', 'client.js'), 'export {}')

      await ensureStudioThemeInstalled(dshHome, source)

      const destination = join(
        dshHome,
        'profiles',
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-aqua'
      )
      const installed = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8')) as {
        version: string
      }
      expect(installed.version).toBe('1.2.3')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('does not re-copy when the installed version already matches', async () => {
    const dir = await makeTempDir()
    try {
      const dshHome = join(dir, 'dshHome')
      const source = join(dir, 'theme-source')
      const destination = join(
        dshHome,
        'profiles',
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-aqua'
      )
      await mkdir(join(source, 'lib'), { recursive: true })
      await writeFile(join(source, 'package.json'), JSON.stringify({ version: '1.2.3' }))
      await writeFile(join(source, 'lib', 'client.js'), 'export {}')

      await ensureStudioThemeInstalled(dshHome, source)
      await writeFile(join(destination, 'lib', 'client.js'), 'export const marker = "user-edit"')
      await ensureStudioThemeInstalled(dshHome, source)

      // Same version: the user-visible marker must survive (no re-copy).
      const content = await readFile(join(destination, 'lib', 'client.js'), 'utf8')
      expect(content).toContain('user-edit')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
