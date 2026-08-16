import { readFile } from 'node:fs/promises'
import { resolveDirectoryPickerBackend } from '@deepseek-ai/dsh-host-directory-picker-auto'
import { describe, expect, it } from 'vitest'

describe('desktop directory picker backend', () => {
  it('uses the browse backend on Windows to avoid the Electron Koffi crash', () => {
    expect(
      resolveDirectoryPickerBackend({
        bindHost: '127.0.0.1',
        platform: 'win32',
        env: {},
        linuxChooser: false
      })
    ).toBe('browse')
  })

  it('preserves native directory pickers on supported desktop hosts', () => {
    expect(
      resolveDirectoryPickerBackend({
        bindHost: '127.0.0.1',
        platform: 'darwin',
        env: {},
        linuxChooser: false
      })
    ).toBe('native')
    expect(
      resolveDirectoryPickerBackend({
        bindHost: '127.0.0.1',
        platform: 'linux',
        env: { DISPLAY: ':0' },
        linuxChooser: true
      })
    ).toBe('native')
  })

  it('captures the Windows override as a reproducible dependency patch', async () => {
    const dependencyPatch = await readFile(
      'patches/@deepseek-ai+dsh-host-directory-picker-auto+0.1.0-rc.6.patch',
      'utf8'
    )

    expect(dependencyPatch).toContain('facts.platform === "darwin"')
    expect(dependencyPatch).toContain('Windows intentionally uses the')
  })
})
