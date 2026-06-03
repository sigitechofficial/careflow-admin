/**
 * Dev-only Vite plugin: POST /__dev/run-ia-playwright runs Playwright IA autofill.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function runPlaywrightFill({ serviceUserId, level }) {
  return new Promise((resolve, reject) => {
    const args = [
      'playwright',
      'test',
      'tests/e2e/service-users/fill-initial-assessment.spec.ts',
      '--project=chromium',
    ]
    const child = spawn('npx', args, {
      cwd: root,
      env: {
        ...process.env,
        E2E_IA_SERVICE_USER_ID: serviceUserId,
        E2E_IA_FILL_LEVEL: level,
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })

    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Playwright autofill timed out after 8 minutes'))
    }, 8 * 60 * 1000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        const tail = (stderr || stdout).split('\n').slice(-12).join('\n')
        reject(new Error(tail || `Playwright exited with code ${code}`))
      }
    })
    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

export function iaPlaywrightRunnerPlugin() {
  return {
    name: 'ia-playwright-runner',
    configureServer(server) {
      const handler = async (req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (pathname !== '/__dev/run-ia-playwright' || req.method !== 'POST') {
          return next()
        }

        try {
          const body = await readJsonBody(req)
          const serviceUserId = String(body.serviceUserId ?? '').trim()
          const level = String(body.level ?? '').trim().toLowerCase()
          if (!serviceUserId) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: 'serviceUserId is required' }))
            return
          }
          if (!['low', 'normal', 'critical'].includes(level)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: 'level must be low, normal, or critical' }))
            return
          }

          if (!process.env.E2E_API_BASE_URL?.trim() || !process.env.E2E_LOGIN_EMAIL?.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                success: false,
                message:
                  'Set E2E_API_BASE_URL, E2E_LOGIN_EMAIL, and E2E_LOGIN_PASSWORD in care-admin/.env, then restart dev server.',
              }),
            )
            return
          }

          await runPlaywrightFill({ serviceUserId, level })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              success: true,
              message: `Playwright filled assessment (${level}) for service user ${serviceUserId}`,
            }),
          )
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              success: false,
              message: e instanceof Error ? e.message : 'Playwright autofill failed',
            }),
          )
        }
      }
      server.middlewares.use(handler)
    },
  }
}
