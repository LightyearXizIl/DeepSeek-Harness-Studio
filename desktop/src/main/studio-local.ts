import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import YAML from 'yaml'

/**
 * [local] DeepSeek Harness Studio local additions.
 *
 * Everything in this module is local-only: it lives in files upstream
 * dsh-desktop does not have, so subtree pulls can never conflict with it.
 * It wires the two Studio-specific pieces that upstream does not know about:
 *  1. the built-in Aqua theme (vendored under vendor/@deepseek-ai/dsh-client-ui-aqua),
 *  2. the local composition patch (build/dsh-local.patch.yml).
 */

const THEME_PACKAGE = '@deepseek-ai/dsh-client-ui-aqua'

function readVersion(packageJsonPath: string): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string }
    return pkg.version
  } catch {
    return undefined
  }
}

/**
 * Install the vendored Aqua theme into the Harness plugin directory so it is
 * available without any external download. The Harness profile plugin loader
 * resolves plugins from <dshHome>/profiles/node_modules (the same mechanism the
 * standalone Aqua installer uses). Copy is version-guarded: when the installed
 * copy already matches the vendored version it is left untouched.
 *
 * Failure is non-fatal: the app must still start even if the theme cannot be
 * installed, so the Harness UI is usable without it.
 */
export async function ensureStudioThemeInstalled(
  dshHome: string,
  themeSource: string
): Promise<void> {
  const destination = join(dshHome, 'profiles', 'node_modules', THEME_PACKAGE)
  try {
    const sourceVersion = readVersion(join(themeSource, 'package.json'))
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
    cpSync(themeSource, destination, { recursive: true })
  } catch (error) {
    console.warn('[studio] failed to install theme, continuing without it:', error)
  }
}

/**
 * Merge the upstream composition patch (deepseek-harness-studio.patch.yml) with
 * the local composition patch (dsh-local.patch.yml) into one YAML document the
 * Harness CLI accepts via --patch. Missing files are skipped; if nothing can be
 * merged the upstream patch path is returned unchanged.
 */
export function mergedPatchPath(
  officialPatch: string,
  localPatch: string,
  userData: string
): string {
  // No local additions: hand the official patch straight through.
  if (!existsSync(localPatch)) return officialPatch
  const parts: unknown[] = []
  const push = (file: string): void => {
    if (!existsSync(file)) return
    try {
      const parsed = YAML.parse(readFileSync(file, 'utf8'))
      if (Array.isArray(parsed)) parts.push(...parsed)
    } catch (error) {
      console.warn(`[studio] failed to parse patch file ${file}:`, error)
    }
  }
  push(officialPatch)
  push(localPatch)
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
