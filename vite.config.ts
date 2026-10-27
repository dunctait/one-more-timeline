import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // @ts-expect-error vitest config field
  test: {
    environment: 'node',
  },
});
