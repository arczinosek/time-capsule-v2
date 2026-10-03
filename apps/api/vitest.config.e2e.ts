import { defineConfig } from 'vitest/config';

// Needs a running, migrated MySQL and apps/api/.env. Not part of the root Vitest projects:
// run it with `pnpm test:e2e` (or `pnpm --filter api test:e2e`).
export default defineConfig({
  ssr: { resolve: { conditions: ['@time-capsule/source'] } }, // see vitest.config.ts
  test: {
    name: 'api-e2e',
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
  },
});
