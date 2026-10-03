import { defineConfig } from 'vitest/config';

// Runs every package's unit tests from the root: `pnpm test`, or one package with
// `pnpm test --project <name>`. Each package owns its vitest.config.ts (with a `name`).
// The api e2e config (vitest.config.e2e.ts) needs MySQL, so it isn't matched here:
// run it with `pnpm test:e2e`.
export default defineConfig({
  test: {
    projects: ['apps/*/vitest.config.ts', 'packages/*/vitest.config.ts'],
  },
});
