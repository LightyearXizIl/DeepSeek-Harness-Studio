import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

const binScript = fileURLToPath(new URL('./fixtures/dots-driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('../cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const hasKey = Boolean(process.env.DOTS_API_KEY)

describe.skipIf(!hasKey)('dots-api with real model', () => {
  it('answers one live prompt on dots3-note-prev', async () => {
    const { stdout, stderr } = await runLoaderSmoke({
      label: 'dots-api real model',
      tempDirPrefix: 'dots-api-real-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [configPath, '用一句话介绍你自己。'],
      tsconfigPath,
      processTimeoutMs: 120_000,
    })
    expect(stderr).toBe('')
    const lines = stdout.trimEnd().split('\n').map(line => JSON.parse(line) as Record<string, unknown>)
    const result = lines.at(-1)
    expect(result).toMatchObject({ type: 'result' })
    expect(String(result?.['output']).trim().length).toBeGreaterThan(0)
  }, 135_000)
})
