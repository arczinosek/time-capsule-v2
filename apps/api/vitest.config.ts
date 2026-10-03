import { defineConfig } from 'vitest/config';

// No `root`: it defaults to this package, both for `pnpm --filter api test` and for the
// root Vitest projects config.
export default defineConfig({
  // Vitest runs node tests in Vite's ssr environment, which ignores top-level
  // resolve.conditions. This resolves @time-capsule/shared to its TS source, so tests never
  // need a shared build.
  ssr: { resolve: { conditions: ['@time-capsule/source'] } },
  test: {
    name: 'api',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
