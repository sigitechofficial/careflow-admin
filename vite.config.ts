import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { iaPlaywrightRunnerPlugin } from './scripts/vite-ia-playwright-runner.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Always load from care-admin root (not shell cwd) so .env is found reliably.
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)

  // Where the dev server's /api proxy sends requests (a second checkout can run its own API on another port).
  const apiTarget = env.DEV_API_PROXY_TARGET || 'http://localhost:3000'

  const plugins: PluginOption[] = [react()]
  if (mode === 'development') {
    plugins.push(iaPlaywrightRunnerPlugin())
  }

  return {
  plugins,
  envDir: __dirname,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@about_me_svgs': path.resolve(__dirname, './public/about_me_svgs'),
      '@interests': path.resolve(__dirname, './public/interests'),
      '@life_history': path.resolve(__dirname, './public/life_history'),
      '@my_daily_routine': path.resolve(__dirname, './public/my_daily_routine'),
      '@support_need': path.resolve(__dirname, './public/support_need'),
      '@favourite_things': path.resolve(__dirname, './public/favourite_things'),
    },
  },
  server: {
    host: true,
    // Proxy API traffic through the dev server so the browser sees same-origin
    // requests — no CORS preflights in local development.
    // Set VITE_API_BASE_URL=/api in .env (see .env.example).
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        ws: true,
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  }
})
