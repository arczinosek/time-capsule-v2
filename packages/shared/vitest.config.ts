import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'shared',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
