import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, process.cwd(), 'API_PROXY_TARGET')

  return {
    plugins: [react()],
    server: {
      proxy: { '/api': API_PROXY_TARGET?.trim() || 'http://127.0.0.1:3000' },
    },
    test: {
      env: { VITE_CLERK_PUBLISHABLE_KEY: '' },
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})

