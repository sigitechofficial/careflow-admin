import { getApiBaseUrl } from '@/shared/lib/api-base'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { fetchWithResilience } from '@/shared/api/http-client'

function nestErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback
  const m = (body as { message?: unknown }).message
  if (typeof m === 'string') return m
  if (Array.isArray(m)) return m.map(String).join('; ')
  return fallback
}

export type BackendMeUser = {
  id: string
  email: string
  roles: string[]
  permissions: string[]
  accountKind?: 'user' | 'temporary_inspector' | 'service_user'
  serviceUserId?: string
  preferredName?: string | null
  profilePhotoUrl?: string | null
  firstName?: string
  lastName?: string
  username?: string
}

export type LoginHistoryRow = {
  id: string
  userId: string | null
  email: string
  event: string
  status: string
  failureReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

function parseJsonEnvelope<T>(body: unknown): ApiEnvelope<T> {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    throw new Error('Unexpected API response')
  }
  return body as ApiEnvelope<T>
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Public POST /auth/login â€” no Bearer. */
export async function backendLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    { retry: { maxRetries: 0 } },
  )

  const body: unknown = await readJsonResponse(res)

  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Login failed'))
  }

  const env = parseJsonEnvelope<{ accessToken: string; refreshToken: string }>(body)
  return env.data
}

/** Public POST /auth/login/temporary-inspector â€” no Bearer. */
export async function backendTemporaryInspectorLogin(
  username: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/login/temporary-inspector`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    },
    { retry: { maxRetries: 0 } },
  )

  const body: unknown = await readJsonResponse(res)

  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Login failed'))
  }

  const env = parseJsonEnvelope<{ accessToken: string; refreshToken: string }>(body)
  return env.data
}

/** Public POST /auth/service-user/login — no Bearer. */
export async function backendServiceUserPortalLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/service-user/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    },
    { retry: { maxRetries: 0 } },
  )

  const body: unknown = await readJsonResponse(res)

  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Login failed'))
  }

  const env = parseJsonEnvelope<{ accessToken: string; refreshToken: string }>(body)
  return env.data
}

/** GET /auth/me with Bearer access token. */
export async function backendMe(accessToken: string): Promise<BackendMeUser> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/me`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    },
    {},
  )

  const body: unknown = await readJsonResponse(res)

  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Session check failed'))
  }

  const env = parseJsonEnvelope<BackendMeUser>(body)
  return env.data
}

/** POST /auth/refresh with current refresh token. */
export async function backendRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')

  const res = await fetchWithResilience(
    `${base}/auth/refresh`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    },
    { retry: { maxRetries: 0 } },
  )

  const body: unknown = await readJsonResponse(res)

  if (!res.ok) {
    throw new Error(nestErrorMessage(body, res.statusText || 'Refresh failed'))
  }

  const env = parseJsonEnvelope<{ accessToken: string; refreshToken: string }>(body)
  return env.data
}

/** POST /auth/change-password */
export async function backendChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiJson<ApiEnvelope<Record<string, never>>>(
    '/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    { retry: { maxRetries: 0 } },
  )
}

/** PATCH /auth/me */
export async function backendUpdateProfile(patch: {
  firstName?: string
  lastName?: string
}): Promise<BackendMeUser> {
  const res = await apiJson<ApiEnvelope<BackendMeUser>>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

  return res.data
}

/** GET /auth/me/login-history */
export async function backendMyLoginHistory(init?: RequestInit): Promise<LoginHistoryRow[]> {
  const res = await apiJson<ApiEnvelope<LoginHistoryRow[]>>('/auth/me/login-history', {
    method: 'GET',
    ...init,
  })
  return res.data
}

export function accessTokenExpiryMs(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null

    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: number }

    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
