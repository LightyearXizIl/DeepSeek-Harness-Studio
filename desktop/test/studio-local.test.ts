import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import YAML from 'yaml'
import {
  ensureStudioPluginInstalled,
  mergedPatchPath,
  migrateLegacyUserData
} from '../src/main/studio-local'

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
      const dshHome = join(dir, 'dshHome')
      await mkdir(userData, { recursive: true })
      await writeFile(official, '- id: directory-picker\n  disabled: true\n')
      await writeFile(
        local,
        '- insert:\n    - id: ui-aqua\n      name: \'@deepseek-ai/dsh-client-ui-aqua\'\n'
      )

      const merged = mergedPatchPath(official, local, userData, dshHome)
      expect(merged).toBe(join(userData, 'deepseek-harness-studio.merged.patch.yml'))

      const parsed = YAML.parse(await readFile(merged, 'utf8')) as Array<Record<string, unknown>>
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({ id: 'directory-picker', disabled: true })
      expect(parsed[1]).toHaveProperty('insert')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('drops local entries already registered by the profile patch layer', async () => {
    const dir = await makeTempDir()
    try {
      const official = join(dir, 'official.yml')
      const local = join(dir, 'local.yml')
      const userData = join(dir, 'userData')
      const dshHome = join(dir, 'dshHome')
      await mkdir(join(userData, 'deepseek-harness-studio'), { recursive: true })
      await mkdir(join(dshHome, 'profiles', 'web'), { recursive: true })
      await writeFile(official, '- id: directory-picker\n  disabled: true\n')
      await writeFile(
        local,
        '- insert:\n    - id: ui-aqua\n      name: \'@deepseek-ai/dsh-client-ui-aqua\'\n    - id: ui-studio-update\n      name: \'@deepseek-ai/dsh-client-ui-studio-update\'\n'
      )
      // The migrated profile already registers ui-aqua.
      await writeFile(
        join(dshHome, 'profiles', 'web', 'cordis.patch.yml'),
        '- insert:\n    - id: ui-aqua\n      name: \'@deepseek-ai/dsh-client-ui-aqua\'\n'
      )

      const merged = mergedPatchPath(official, local, userData, dshHome)
      const parsed = YAML.parse(await readFile(merged, 'utf8')) as Array<Record<string, unknown>>
      const insert = (parsed[1] as { insert: Array<{ id: string }> }).insert
      const ids = insert.map((row) => row.id)
      expect(ids).not.toContain('ui-aqua')
      expect(ids).toContain('ui-studio-update')
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
      const dshHome = join(dir, 'dshHome')
      await mkdir(userData, { recursive: true })
      await writeFile(official, '- id: directory-picker\n  disabled: true\n')

      expect(mergedPatchPath(official, missing, userData, dshHome)).toBe(official)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('ensureStudioPluginInstalled', () => {
  it('copies the vendored plugin into the Harness plugin directory', async () => {
    const dir = await makeTempDir()
    try {
      const dshHome = join(dir, 'dshHome')
      const source = join(dir, 'plugin-source')
      await mkdir(join(source, 'lib'), { recursive: true })
      await writeFile(join(source, 'package.json'), JSON.stringify({ version: '1.2.3' }))
      await writeFile(join(source, 'lib', 'client.js'), 'export {}')

      await ensureStudioPluginInstalled(dshHome, '@deepseek-ai/dsh-client-ui-aqua', source)

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
      const source = join(dir, 'plugin-source')
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

      await ensureStudioPluginInstalled(dshHome, '@deepseek-ai/dsh-client-ui-aqua', source)
      await writeFile(join(destination, 'lib', 'client.js'), 'export const marker = "user-edit"')
      await ensureStudioPluginInstalled(dshHome, '@deepseek-ai/dsh-client-ui-aqua', source)

      // Same version: the user-visible marker must survive (no re-copy).
      const content = await readFile(join(destination, 'lib', 'client.js'), 'utf8')
      expect(content).toContain('user-edit')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('migrateLegacyUserData', () => {
  it('copies the legacy dsh-desktop harness data once into the new location', async () => {
    const dir = await makeTempDir()
    try {
      const appData = join(dir, 'appData')
      const legacy = join(appData, 'dsh-desktop')
      const userData = join(appData, 'deepseek-harness-studio')
      await mkdir(join(legacy, 'harness', 'credentials'), { recursive: true })
      await writeFile(join(legacy, 'harness', 'credentials', 'keys.json'), '{"secret":"local-only"}')
      // Electron/Chromium state next to the legacy harness must not follow.
      await writeFile(join(legacy, 'Preferences'), 'chromium')

      await migrateLegacyUserData(userData, appData)

      const migrated = await readFile(
        join(userData, 'harness', 'credentials', 'keys.json'),
        'utf8'
      )
      expect(migrated).toBe('{"secret":"local-only"}')
      // Only the harness subdirectory is copied.
      await expect(readFile(join(userData, 'Preferences'), 'utf8')).rejects.toThrow()
      // Legacy stays untouched.
      expect(await readFile(join(legacy, 'harness', 'credentials', 'keys.json'), 'utf8')).toBe(
        '{"secret":"local-only"}'
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('still migrates when Electron already created the empty userData directory', async () => {
    const dir = await makeTempDir()
    try {
      const appData = join(dir, 'appData')
      const legacy = join(appData, 'dsh-desktop')
      const userData = join(appData, 'deepseek-harness-studio')
      await mkdir(join(legacy, 'harness', 'sessions'), { recursive: true })
      await writeFile(join(legacy, 'harness', 'sessions', 'old.json'), 'legacy')
      // Electron creates userData on startup; only the harness subdirectory
      // is the already-migrated marker.
      await mkdir(userData, { recursive: true })

      await migrateLegacyUserData(userData, appData)

      expect(await readFile(join(userData, 'harness', 'sessions', 'old.json'), 'utf8')).toBe(
        'legacy'
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('does nothing when the new harness data already exists', async () => {
    const dir = await makeTempDir()
    try {
      const appData = join(dir, 'appData')
      const legacy = join(appData, 'dsh-desktop')
      const userData = join(appData, 'deepseek-harness-studio')
      await mkdir(join(legacy, 'harness'), { recursive: true })
      await writeFile(join(legacy, 'harness', 'old.txt'), 'legacy')
      await mkdir(join(userData, 'harness'), { recursive: true })
      await writeFile(join(userData, 'harness', 'new.txt'), 'new')

      await migrateLegacyUserData(userData, appData)

      // New data wins; legacy file must not leak in.
      await expect(readFile(join(userData, 'harness', 'old.txt'), 'utf8')).rejects.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
