import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      'server-only': new URL('./test/serverOnlyStub.ts', import.meta.url).pathname,
    },
  },
});
