import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/?(*.)+(spec|test).ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/src/config/**'],
    root: './',
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
