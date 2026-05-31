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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host,
    port: previewPort,
  },
})
