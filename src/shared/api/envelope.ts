/** Helpers for the Nest JSON conventions shared by feature API modules. No React imports. */

/** The Nest ResponseInterceptor wraps JSON as `{ success, message, data }`; tolerate a bare body too. */
export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

/** `?a=1&b=x` from a params object; `undefined`, `null` and `''` values are dropped. */
export function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}
