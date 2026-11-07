/** Route list and API lookups shared by the route audit and the axe accessibility scan. */

const API = process.env.E2E_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
const EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@careadmin.local'
const PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'Admin@12345'

export async function getAccessToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const body = (await res.json()) as { data?: { accessToken?: string }; message?: string }
  if (!res.ok || !body.data?.accessToken) {
    throw new Error(`API login failed: ${body.message ?? res.statusText}`)
  }
  return body.data.accessToken
}

export async function getFirstServiceUserId(token: string): Promise<string> {
  const res = await fetch(`${API}/service-users?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const body = (await res.json()) as {
    data?: { id: string }[] | { items?: { id: string }[]; rows?: { id: string }[] }
  }
  if (!res.ok) throw new Error(`List service users failed: ${res.status}`)
  const raw = body.data
  const items = Array.isArray(raw) ? raw : (raw?.items ?? raw?.rows ?? [])
  const id = items[0]?.id
  if (!id) throw new Error('No service users in database — seed or create one first.')
  return id
}

/** Major authenticated routes. `suId` is a service user id (E2E_SERVICE_USER_ID or the first one). */
export function majorRoutes(suId: string): { path: string; label: string }[] {
  return [
    { path: '/', label: 'Home' },
    { path: '/account', label: 'Account' },
    { path: '/employee/staff-list', label: 'Employee staff list' },
    { path: '/employee/compliance', label: 'Employee compliance' },
    { path: '/employee/skills', label: 'Employee skills' },
    { path: '/employee/documents', label: 'Employee documents' },
    { path: '/employee/add', label: 'Add employee' },
    { path: '/scheduling/schedule-jobs', label: 'Schedule jobs' },
    { path: '/scheduling/build', label: 'Build schedule' },
    { path: '/scheduling/report', label: 'Scheduling report' },
    { path: '/scheduling/jobs', label: 'Manage schedule jobs' },
    { path: '/scheduling/list', label: 'Schedule list' },
    { path: '/scheduling/templates', label: 'Schedule templates' },
    { path: '/settings/general', label: 'General settings' },
    { path: '/settings/company', label: 'Company settings' },
    { path: '/settings/location-management', label: 'Location management' },
    { path: '/settings/care-pathway', label: 'Care pathway settings' },
    { path: '/accidents-incidents/view', label: 'Accidents view' },
    { path: '/accidents-incidents/raise', label: 'Raise accident' },
    { path: '/admin/security', label: 'Admin security' },
    { path: '/admin/audit', label: 'Audit log' },
    { path: '/service-users/all', label: 'Service users list' },
    { path: '/service-users/add', label: 'Add service user' },
    { path: '/service-users/initial-assessment-checklist', label: 'Initial assessment' },
    { path: `/service-users/${suId}/view`, label: 'View service user' },
    { path: `/service-users/${suId}/profile`, label: 'Service user profile' },
    { path: `/service-users/${suId}/care-plan`, label: 'Care plan' },
    { path: `/service-users/${suId}/medication`, label: 'Medication' },
    { path: `/service-users/${suId}/observations`, label: 'Observations' },
  ]
}
