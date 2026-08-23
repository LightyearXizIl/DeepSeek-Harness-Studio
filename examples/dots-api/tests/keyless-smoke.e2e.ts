import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const binScript = fileURLToPath(new URL('./fixtures/dots-driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('../cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))

describe('dots-api keyless smoke', () => {
  it('boots the hand-declared dots route and fails the first request loud without DOTS_API_KEY', async () => {
    const { stdout, stderr } = await runLoaderSmoke({
      label: 'dots-api',
      tempDirPrefix: 'dots-api-smoke-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [configPath, 'introduce yourself in one sentence'],
      tsconfigPath,
      // The smoke owns the credential plane: an empty value blocks both an
      // ambient DOTS_API_KEY and the root .env the driver would otherwise load,
      // so a locally stored real key cannot turn this keyless proof live.
      env: { DOTS_API_KEY: '' },
    })
    const lines = stdout.trimEnd().split('\n').map(line => JSON.parse(line) as Record<string, unknown>)
    const events = lines.slice(0, -1).map(line => line['event'] as SessionEvent)
    const result = lines.at(-1)
    expect(stderr).toBe('')
    expect(result).toMatchObject({ type: 'result' })
    const header = events.find(event => event.type === 'request/header')
    expect(header).toBeDefined()
    if (header?.type === 'request/header') {
      expect(header.data.header.config).toMatchObject({ provider: 'dots', model: 'dots3-note-prev' })
    }
    const context = events.find(event => event.type === 'request/context')
    if (context?.type === 'request/context') {
      expect(context.data).toMatchObject({ provider: 'dots', model: 'dots3-note-prev', contextWindow: 524288 })
    }
    const turnEnd = events.find(event => event.type === 'turn/end')
    expect(turnEnd?.type === 'turn/end' ? turnEnd.data.reason : undefined).toMatchObject({
      kind: 'error',
      error: { code: 'MISSING_CREDENTIAL' },
    })
    expect(JSON.stringify(turnEnd)).toContain('DOTS_API_KEY')
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
