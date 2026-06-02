import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.HOST ?? process.env.LISTEN ?? true
const port = Number(process.env.PORT) || 5173
const previewPort = Number(process.env.PREVIEW_PORT) || 4173

export default defineConfig({
  plugins: [react()],
  server: {
    host,
    port,
    strictPort: true,
    cors: true,
    allowedHosts: true,
    hmr: {
      host: true,
      port,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host,
    port: previewPort,
  },
})
