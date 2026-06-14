/**
 * Accept all pending IA care plan recommendations and publish composed drafts.
 */
const API = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000'
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@careadmin.local'
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'Admin@12345'
const SU_ID = process.env.E2E_IA_SERVICE_USER_ID ?? 'e20b7b7a-0911-4b98-b23d-eb3995802e83'

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

async function buildCarePlanValues(token, formId, compose) {
  const values = { ...(compose.values ?? {}) }
  for (const gap of compose.gaps ?? []) {
    if (values[gap.fieldKey] == null || values[gap.fieldKey] === '') {
      values[gap.fieldKey] = `E2E completed — ${gap.label}`
    }
  }
  if (Object.keys(values).length > 0) return values

  const form = await api(`/form-builder/${formId}`, { token })
  for (const section of form.sections ?? []) {
    for (const field of section.fields ?? []) {
      const key = `${section.id}:${field.id}`
      if (values[key] != null && values[key] !== '') continue
      switch (field.fieldType) {
        case 'YES_NO':
        case 'CHECKBOX':
          values[key] = false
          break
        case 'NUMBER':
          values[key] = '1'
          break
        case 'DATE':
          values[key] = new Date().toISOString().slice(0, 10)
          break
        case 'TIME':
          values[key] = '09:00'
          break
        case 'SELECT':
          values[key] = field.options?.[0]?.value ?? field.options?.[0] ?? 'E2E'
          break
        default:
          values[key] = `E2E completed — ${field.label}`
      }
    }
  }
  return values
}

async function main() {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  })
  const token = login.accessToken
  if (!token) throw new Error('Login failed')

  const subs = await api(`/service-users/${SU_ID}/initial-assessments?limit=5&sortOrder=desc`, { token })
  const submission = (Array.isArray(subs) ? subs : subs.items ?? []).find(
    (s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED',
  )
  if (!submission) throw new Error('No submitted IA found')
  console.log(`Using submission ${submission.id} (${submission.status})`)

  const summary = await api(
    `/service-users/${SU_ID}/initial-assessments/${submission.id}/summary`,
    { token },
  )
  const recs = summary.carePlanRecommendations ?? []
  console.log(`Care plan recommendations: ${recs.length}`)

  if (submission.status === 'SUBMITTED') {
    await api(`/service-users/${SU_ID}/initial-assessments/${submission.id}/review`, {
      method: 'PATCH',
      token,
      body: {
        status: 'REVIEWED',
        approvedForCareStart: true,
        reviewNotes: 'E2E manager review — approved for care start.',
      },
    })
    console.log('Manager review complete (REVIEWED + approved for care start)')
  }

  for (const rec of recs) {
    if (rec.status !== 'pending') continue
    if (!rec.carePathwayFormId) {
      console.log(`  Skip ${rec.title} — no form mapped`)
      continue
    }
    await api(
      `/service-users/${SU_ID}/initial-assessments/${submission.id}/care-plan-recommendations/${rec.id}`,
      {
        method: 'PATCH',
        token,
        body: { decision: 'accepted' },
      },
    )
    console.log(`  Accepted: ${rec.title} → form ${rec.carePathwayFormId}`)
  }

  const accepted = await api(`/service-users/${SU_ID}/initial-assessments/accepted-care-plans`, { token })
  const items = accepted.items ?? accepted ?? []
  console.log(`\nAccepted care plans: ${items.length}`)

  for (const item of items) {
    const formId = item.formId ?? item.carePathwayFormId
    if (!formId) continue
    const formName = item.formName ?? item.name ?? formId
    console.log(`\nCompleting care plan: ${formName}`)

    try {
      await api(`/service-users/${SU_ID}/care-plans/${formId}/instance`, { method: 'POST', token })
      const compose = await api(`/service-users/${SU_ID}/care-plans/${formId}/compose`, { token })
      const values = await buildCarePlanValues(token, formId, compose)

      await api(`/service-users/${SU_ID}/care-plans/${formId}/draft`, {
        method: 'PATCH',
        token,
        body: {
          values,
          composedFrom: compose.composedFrom,
          gaps: compose.gaps,
        },
      })

      await api(`/service-users/${SU_ID}/care-plans/${formId}/publish`, {
        method: 'POST',
        token,
        body: {
          summary: `E2E publish — ${formName}`,
          gapAcknowledged: true,
        },
      })
      console.log(`  Published ${formName} (${Object.keys(values).length} fields)`)
    } catch (e) {
      console.error(`  Failed ${formName}: ${e.message}`)
    }
  }

  const assessments = await api(`/service-users/${SU_ID}/assessments`, { token })
  console.log(`\nService user assessments on file: ${Array.isArray(assessments) ? assessments.length : 0}`)
  if (Array.isArray(assessments)) {
    for (const a of assessments) {
      console.log(`  - ${a.title ?? a.assessmentKey}: ${a.latestCompletion?.summary ?? '—'}`)
    }
  }

  console.log(`\nCare plan page: http://localhost:5173/service-users/${SU_ID}/care-plan`)
  console.log(`IA schedule tab: http://localhost:5173/service-users/initial-assessment?serviceUserId=${SU_ID}&tab=schedule`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
