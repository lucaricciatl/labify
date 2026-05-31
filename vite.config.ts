import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow overriding the bind address/port via env vars:
//   HOST=192.168.1.5 PORT=3000 npm run dev
//   LISTEN=192.168.1.5 PREVIEW_PORT=4000 npm run preview
// Defaults to 0.0.0.0 (all interfaces) — true means expose to LAN/public.
const host = process.env.HOST ?? process.env.LISTEN ?? true
const port = Number(process.env.PORT) || 5173
const previewPort = Number(process.env.PREVIEW_PORT) || 4173

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host,
    port,
  },
  preview: {
    host,
    port: previewPort,
  },
})
