import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// QIS-HTTPS-LAN-01: when frontend/certs/dev-cert.pem and dev-key.pem exist (created by
// `node scripts/make-dev-cert.mjs`) the frontend is served over HTTPS, which lets the browser give the page
// the clipboard (one-click picture copy). Without them, or with QIS_HTTPS=off, it stays plain HTTP as before.
function loadHttpsOptions() {
  if (process.env.QIS_HTTPS === 'off') return undefined
  const certDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'certs')
  const keyFile = path.join(certDir, 'dev-key.pem')
  const certFile = path.join(certDir, 'dev-cert.pem')
  if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) return undefined
  return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
}

const https = loadHttpsOptions()

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5178,
    strictPort: true,
    https,
    proxy: {
      // Over HTTPS the browser may not call the plain-HTTP backend directly (mixed content), so the page
      // talks to /api on its own address and Vite forwards it to the backend on this computer.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5178,
    strictPort: true,
    https,
  }
})
