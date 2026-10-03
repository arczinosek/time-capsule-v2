import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes and
    // splits route components into lazy chunks.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Same alias as "paths" in tsconfig.json / tsconfig.app.json.
    alias: { '~': path.resolve(import.meta.dirname, 'src') },
    // Serve @time-capsule/shared from its TS source (see packages/shared/package.json exports).
    // Setting conditions replaces Vite's defaults, so spread them back in.
    conditions: ['@time-capsule/source', ...defaultClientConditions],
  },
});
