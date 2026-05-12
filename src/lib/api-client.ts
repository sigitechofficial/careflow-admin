import { useAuthStore } from '@/store/auth.store'
import { getApiBaseUrl } from '@/lib/api-base'
import { fetchWithResilience, type FetchResilienceOptions } from '@/lib/http-client'

export { getApiBaseUrl } from '@/lib/api-base'
export type { FetchResilienceOptions } from '@/lib/http-client'

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  meta?: unknown
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

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
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
  const token = useAuthStore.getState().accessToken
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.method && init.method !== 'GET' && init.method !== 'HEAD') {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  let res: Response
  try {
    res = await fetchWithResilience(url, { ...init, headers }, requestOptions)
  } catch (e) {
    if (isAbortError(e)) {
      throw new ApiError('Request timed out', 0)
    }
    throw e
  }
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Request failed', res.status, body)
  }
  return body as T
}
