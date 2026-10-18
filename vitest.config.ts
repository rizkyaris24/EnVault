import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // Renderer component tests are .tsx files that opt in to happy-dom with a docblock.
  esbuild: { jsx: 'automatic' },
  test: {
    pool: 'forks',
    teardownTimeout: 2000
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  }
})
