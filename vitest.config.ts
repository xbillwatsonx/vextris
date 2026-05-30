import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  test: {
    include: ['src/tests/**/*.test.ts'],
  },
});
