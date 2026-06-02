/**
 * Soft-deletes all IA submissions for the demo service user and creates a fresh draft.
 * Usage: node scripts/reset-ia-demo-submission.mjs
 */
const API = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000'
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@careadmin.local'
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'Admin@12345'
const SU_ID = process.env.IA_SERVICE_USER_ID ?? 'e20b7b7a-0911-4b98-b23d-eb3995802e83'

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  }
  return json.data ?? json
}

async function main() {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  })
  const token = login.accessToken
  if (!token) throw new Error('Login failed')

  const list = await api(`/service-users/${SU_ID}/initial-assessments?limit=50&sortOrder=desc`, {
    token,
  })
  const submissions = Array.isArray(list) ? list : list.items ?? []

  for (const sub of submissions) {
    if (sub.deletedAt) continue
    await api(`/service-users/${SU_ID}/initial-assessments/${sub.id}`, {
      method: 'DELETE',
      token,
    })
    console.log(`Deleted submission ${sub.id} (${sub.status})`)
  }

  if (submissions.filter((s) => !s.deletedAt).length === 0) {
    console.log('No active submissions to delete')
  }

  const created = await api(`/service-users/${SU_ID}/initial-assessments`, {
    method: 'POST',
    token,
    body: {},
  })
  console.log(`Created draft submission ${created.id} (${created.status})`)
  console.log(
    `\nOpen: http://localhost:5173/service-users/initial-assessment?serviceUserId=${SU_ID}&section=1&tab=form`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
