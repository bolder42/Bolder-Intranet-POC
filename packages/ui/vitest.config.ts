import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import shared from '@repo/vitest-config';

export default mergeConfig(
  shared,
  defineConfig({
    plugins: [react()],
    test: {
      name: 'ui',
    },
  }),
);