import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import cocApiPlugin from './server/cocApiPlugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.COC_API_TOKEN ?? process.env.COC_API_TOKEN

  return {
    plugins: [react(), tailwindcss(), cocApiPlugin({ token })],
  }
})
