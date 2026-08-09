import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Base44 plugin loads for dev; won't interfere with local mode
    // To fully disable, use vite.config.local.js
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // API proxy always goes to Base44 hosted backend on port 4400
      // In local mode your Express server runs here
      // Just change the target when switching modes
      '/api': {
        target: 'http://localhost:4400',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4400',
        changeOrigin: true,
      },
    },
  },
});