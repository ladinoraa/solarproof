import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    environmentMatchGlobs: [
      ['src/__tests__/components/**', 'jsdom'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@solarproof/stellar': path.resolve(__dirname, '../../packages/stellar/src/index.ts'),
    },
  },
})
