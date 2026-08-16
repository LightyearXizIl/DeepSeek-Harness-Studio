import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import YAML from 'yaml'

/**
 * [local] DeepSeek Harness Studio local additions.
 *
 * Everything in this module is local-only: it lives in files upstream
 * dsh-desktop does not have, so subtree pulls can never conflict with it.
 * It wires the two Studio-specific pieces that upstream does not know about:
 *  1. the built-in Aqua theme (vendored under vendor/@deepseek-ai/dsh-client-ui-aqua),
 *  2. the local composition patch (build/dsh-local.patch.yml),
 *  3. one-time migration of legacy DSH Desktop user data (credentials, sessions).
 */

const LEGACY_USER_DATA_DIR = 'dsh-desktop'

function readVersion(packageJsonPath: string): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string }
    return pkg.version
  } catch {
    return undefined
  }
}

/**
 * Install a vendored Studio package (Aqua theme, Update section, ...) into the
 * Harness plugin directory so it is available without any external download.
 * The Harness profile plugin loader resolves plugins from
 * <dshHome>/profiles/node_modules (the same mechanism the standalone Aqua
 * installer uses). Copy is version-guarded: when the installed copy already
 * matches the vendored version it is left untouched.
 *
 * Failure is non-fatal: the app must still start even if the package cannot
 * be installed, so the Harness UI is usable without it.
 */
export async function ensureStudioPluginInstalled(
  dshHome: string,
  packageName: string,
  packageSource: string
): Promise<void> {
  const destination = join(dshHome, 'profiles', 'node_modules', packageName)
  try {
    const sourceVersion = readVersion(join(packageSource, 'package.json'))
    const destinationVersion = readVersion(join(destination, 'package.json'))
    if (
      destinationVersion !== undefined &&
      destinationVersion === sourceVersion &&
      existsSync(join(destination, 'lib', 'client.js'))
    ) {
      return
    }
    mkdirSync(dirname(destination), { recursive: true })
    if (existsSync(destination)) {
      rmSync(destination, { recursive: true, force: true })
    }
    cpSync(packageSource, destination, { recursive: true })
  } catch (error) {
    console.warn(`[studio] failed to install ${packageName}, continuing without it:`, error)
  }
}

/**
 * One-time migration of the legacy official DSH Desktop user data so the
 * Studio release inherits locally stored credentials (API keys), sessions,
 * profiles and plugins. The official app stores the Harness data under
 * <appData>/dsh-desktop/harness; the Studio app uses
 * <appData>/deepseek-harness-studio/harness (rebranded identity), so without
 * this step a first run would look like a fresh installation.
 *
 * Only the harness subdirectory is copied: everything else under the legacy
 * userData directory is Electron/Chromium state (caches, preferences) that
 * must not follow the user. The copy happens only when the Studio harness
 * directory does not exist yet. Electron creates the userData directory
 * itself on startup, so its presence says nothing about whether migration
 * already happened; the harness directory is created only when the Harness
 * runtime starts, which happens after this call, so it is the reliable
 * already-migrated marker. The legacy directory is never touched (the old
 * app keeps working) and migration is non-fatal: if the copy fails (e.g. the
 * legacy app is running and holds file locks), the app still starts with
 * fresh data and the user can retry later or migrate manually.
 */
export async function migrateLegacyUserData(userData: string, appData: string): Promise<void> {
  const legacy = join(appData, LEGACY_USER_DATA_DIR, 'harness')
  const harness = join(userData, 'harness')
  try {
    if (existsSync(harness)) return
    if (!existsSync(legacy)) return
    mkdirSync(dirname(harness), { recursive: true })
    cpSync(legacy, harness, { recursive: true })
    console.log(`[studio] migrated legacy harness data from ${legacy}`)
  } catch (error) {
    console.warn('[studio] legacy user-data migration failed, continuing with fresh data:', error)
  }
}

/**
 * Collect every loader entry id already registered by the profile patch layer
 * (<dshHome>/profiles/<profile>/cordis.patch.yml). The Harness CLI applies the
 * profile patch layer on top of the --patch argument, so an id present in both
 * sources makes the loader fail with "duplicate loader entry id" (observed
 * after migrating a legacy DSH Desktop profile that had installed Aqua through
 * the standalone installer).
 */
function profileRegisteredIds(dshHome: string): Set<string> {
  const ids = new Set<string>()
  const profilesDir = join(dshHome, 'profiles')
  try {
    const entries = readdirSync(profilesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const patchPath = join(profilesDir, entry.name, 'cordis.patch.yml')
      if (!existsSync(patchPath)) continue
      const parsed = YAML.parse(readFileSync(patchPath, 'utf8'))
      if (!Array.isArray(parsed)) continue
      for (const item of parsed) {
        if (item === null || typeof item !== 'object') continue
        const insert = (item as { insert?: unknown }).insert
        if (!Array.isArray(insert)) continue
        for (const row of insert) {
          if (row !== null && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string') {
            ids.add((row as { id: string }).id)
          }
        }
      }
    }
  } catch {
    // Profile layer unreadable: fall back to inserting everything.
  }
  return ids
}

/**
 * Merge the upstream composition patch (deepseek-harness-studio.patch.yml) with
 * the local composition patch (dsh-local.patch.yml) into one YAML document the
 * Harness CLI accepts via --patch. Missing files are skipped; if nothing can be
 * merged the upstream patch path is returned unchanged.
 *
 * Local-patch entries whose id is already registered by the profile patch layer
 * are dropped (dedupe), so migrated profiles that already carry built-in
 * plugins (e.g. ui-aqua installed by the standalone installer) do not crash the
 * loader with a duplicate entry.
 */
export function mergedPatchPath(
  officialPatch: string,
  localPatch: string,
  userData: string,
  dshHome: string
): string {
  // No local additions: hand the official patch straight through.
  if (!existsSync(localPatch)) return officialPatch
  const registered = profileRegisteredIds(dshHome)
  const parts: unknown[] = []
  const push = (file: string, dedupeIds: Set<string> | undefined): void => {
    if (!existsSync(file)) return
    try {
      const parsed = YAML.parse(readFileSync(file, 'utf8'))
      if (!Array.isArray(parsed)) return
      for (const item of parsed) {
        if (
          item !== null &&
          typeof item === 'object' &&
          Array.isArray((item as { insert?: unknown }).insert)
        ) {
          const insert = ((item as { insert: unknown[] }).insert).filter((row) => {
            if (dedupeIds === undefined) return true
            if (row === null || typeof row !== 'object') return true
            const id = (row as { id?: unknown }).id
            return typeof id !== 'string' || !dedupeIds.has(id)
          })
          if (insert.length > 0) parts.push({ ...(item as object), insert })
        } else {
          parts.push(item)
        }
      }
    } catch (error) {
      console.warn(`[studio] failed to parse patch file ${file}:`, error)
    }
  }
  push(officialPatch, undefined)
  push(localPatch, registered)
  if (parts.length === 0) return officialPatch
  const merged = join(userData, 'deepseek-harness-studio.merged.patch.yml')
  try {
    mkdirSync(dirname(merged), { recursive: true })
    writeFileSync(merged, YAML.stringify(parts))
    return merged
  } catch (error) {
    console.warn('[studio] failed to write merged patch, falling back to upstream:', error)
    return officialPatch
  }
}
