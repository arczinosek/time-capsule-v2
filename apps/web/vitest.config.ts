import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Tests reuse the app's Vite config: router plugin, react, ~ alias and the
// @time-capsule/source condition (jsdom runs in Vite's client environment).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'web',
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.spec.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      // Hermetic: ignore .env/.env.local overrides. MSW handlers build URLs from the same value.
      env: { VITE_API_URL: 'http://api.test' },
    },
  }),
);
