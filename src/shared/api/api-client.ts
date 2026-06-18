import { useAuthStore } from '@/features/auth/store'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { fetchWithResilience, type FetchResilienceOptions } from '@/shared/api/http-client'

export { getApiBaseUrl } from '@/shared/lib/api-base'
export type { FetchResilienceOptions } from '@/shared/api/http-client'

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  meta?: unknown
}

export type ApiErrorBody = {
  success?: boolean
  message?: string
  errors?: unknown[]
}

/** Turn Nest validation `errors[]` into a readable single-line message. */
export function formatApiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback
  const record = body as ApiErrorBody
  const errors = record.errors
  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors.map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null) {
        const row = item as Record<string, unknown>
        if (typeof row.message === 'string') return row.message
        if (Array.isArray(row.constraints)) {
          return row.constraints.filter((c): c is string => typeof c === 'string').join(', ')
        }
        if (row.constraints && typeof row.constraints === 'object') {
          return Object.values(row.constraints as Record<string, string>).join(', ')
        }
        if (typeof row.property === 'string' && row.constraints) {
          return `${row.property}: ${Object.values(row.constraints as Record<string, string>).join(', ')}`
        }
      }
      return String(item)
    })
    const detail = parts.filter(Boolean).join('; ')
    if (detail) return detail
  }
  if (typeof record.message === 'string' && record.message.trim() && record.message !== 'Validation failed') {
    return record.message
  }
  return fallback
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ApiJsonOptions = FetchResilienceOptions

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

/** Refresh the access token proactively if it expires within this many ms. */
const PROACTIVE_REFRESH_WINDOW_MS = 30_000

/** Shared in-flight refresh, so concurrent requests don't all hit /auth/refresh. */
let refreshInFlight: Promise<boolean> | null = null

function tokenExpiresSoon(): boolean {
  const { accessToken, accessExpiresAt } = useAuthStore.getState()
  if (!accessToken) return false
  if (!accessExpiresAt) return false
  return accessExpiresAt - Date.now() < PROACTIVE_REFRESH_WINDOW_MS
}

async function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = useAuthStore.getState().refreshTokens().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

function buildRequestHeaders(init: RequestInit, token: string | null): Headers {
  const headers = new Headers(init.headers)
  if (
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type') &&
    init.method &&
    init.method !== 'GET' &&
    init.method !== 'HEAD'
  ) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

/** JSON request to CareAdmin API (Bearer from auth store when present). */
export async function apiJson<T>(
  path: string,
  init: RequestInit & { parseJson?: boolean } = {},
  requestOptions?: ApiJsonOptions,
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`

  // Pre-flight: refresh if the access token is about to expire (or just expired).
  if (tokenExpiresSoon() && useAuthStore.getState().refreshToken) {
    await refreshAccessTokenOnce()
  }

  // Retry-on-401 loop: at most one refresh-and-retry per call.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = useAuthStore.getState().accessToken
    const headers = buildRequestHeaders(init, token)

    const res = await fetchWithResilience(url, { ...init, headers }, requestOptions)

    if (
      res.status === 401 &&
      attempt === 0 &&
      useAuthStore.getState().refreshToken
    ) {
      const ok = await refreshAccessTokenOnce()
      if (ok) continue
    }

    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }
    if (!res.ok) {
      const fallback = res.statusText || 'Request failed'
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? formatApiErrorMessage(body, String((body as { message: unknown }).message) || fallback)
          : fallback
      throw new ApiError(msg || fallback, res.status, body)
    }
    return body as T
  }
  throw new ApiError('Request failed', 0)
}
