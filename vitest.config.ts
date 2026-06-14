import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      include: ['src/core/**'],
      thresholds: { lines: 90, functions: 90, branches: 80 },
    },
  },
});
