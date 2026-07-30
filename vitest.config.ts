import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Telas esperam o provider mock (latência simulada) várias vezes por teste;
    // sob paralelismo os 5000ms padrão estouram. Ver nota em src/test/setup.ts.
    testTimeout: 15000,
  },
})
