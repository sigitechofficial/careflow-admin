const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PATH_UUID_RE =
  /\/service-users\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

/** Normalize route param to a bare service user UUID (router param only — safe for SPA navigation). */
export function resolveServiceUserIdFromParams(paramId?: string | null): string {
  const raw = (paramId ?? '').trim()
  const first = raw.split('/')[0]?.trim() ?? ''
  return UUID_RE.test(first) ? first : ''
}

/** Normalize route param / pathname to a bare service user UUID. */
export function resolveServiceUserIdFromRoute(paramId?: string | null): string {
  const fromParams = resolveServiceUserIdFromParams(paramId)
  if (fromParams) return fromParams
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(PATH_UUID_RE)
    if (m?.[1] && UUID_RE.test(m[1])) return m[1]
  }
  return ''
}
