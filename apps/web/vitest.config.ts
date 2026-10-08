import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import shared from '@repo/vitest-config';

export default mergeConfig(
  shared,
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      name: 'web',
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      server: {
        deps: {
          // Workspace packages ship raw source; let Vite transform them.
          inline: ['@bolder/ui', '@bolder/shared'],
        },
      },
    },
  }),
);
