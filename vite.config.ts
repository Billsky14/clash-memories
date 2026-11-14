import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8787'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.COC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
  const proxySecret = env.COC_PROXY_SECRET?.trim() ?? ''

  if (!proxySecret) {
    console.warn(
      '[coc] COC_PROXY_SECRET belum diset; backend akan menolak permintaan /api/coc.',
    )
  }

  const proxy = {
    '/api/coc': {
      target: apiBaseUrl,
      headers: proxySecret ? { 'x-coc-proxy-secret': proxySecret } : {},
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
