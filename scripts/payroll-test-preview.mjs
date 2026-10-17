/**
 * Starts the admin app against the payroll TEST API (careadmin-backend/scripts/payroll-test-server.mjs),
 * on its own port, so payroll screens can be checked in a browser with synthetic data only.
 *
 *   node scripts/payroll-test-preview.mjs
 *
 * - App: http://localhost:5174 (PAYROLL_TEST_APP_PORT to change it).
 * - API: http://localhost:3101 (PAYROLL_TEST_API_PORT). Only a local API is accepted.
 * The normal dev server (port 5173) and its API are not affected.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apiPort = process.env.PAYROLL_TEST_API_PORT ?? '3101'
const port = Number(process.env.PAYROLL_TEST_APP_PORT ?? 5174)
// A variable that already exists wins over the .env files.
process.env.VITE_API_BASE_URL = `http://localhost:${apiPort}`

// Tailwind and PostCSS find their configuration from the working directory.
process.chdir(root)
const server = await createServer({
  root,
  configFile: join(root, 'vite.config.ts'),
  // Its own dependency cache, so the normal dev server's cache is left alone.
  cacheDir: join(root, 'node_modules', '.vite-payroll-test'),
  server: { port, strictPort: true },
})
await server.listen()
server.printUrls()
console.log(`payroll test preview: API http://localhost:${apiPort}`)
