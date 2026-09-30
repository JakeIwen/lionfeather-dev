import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Polling keeps local edits visible in workspaces where native events are lost.
    watch: {
      usePolling: true,
      interval: 300,
      ignored: [
        '**/.agent/**',
        '**/.local/**',
        '**/*.private.md',
        '**/dist/**',
      ],
    },
    fs: {
      strict: true,
      deny: [
        '**/.env',
        '**/.env.*',
        '**/*.{crt,pem}',
        '**/.git/**',
        '**/.agent/**',
        '**/.local/**',
        '**/*.private.md',
      ],
    },
  },
  build: { sourcemap: false },
})
