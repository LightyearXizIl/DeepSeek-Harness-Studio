import { defineConfig } from 'vitest/config'

// The desktop app lives inside the harness monorepo, whose root vitest.config.ts
// only covers packages/*/*/tests. Keep desktop tests isolated so `npm test`
// runs exactly the desktop suite (test/**/*.test.ts).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
