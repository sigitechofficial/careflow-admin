const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PATH_UUID_RE =
  /\/service-users\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

/** Normalize route param / pathname to a bare service user UUID. */
export function resolveServiceUserIdFromRoute(paramId?: string | null): string {
  const raw = (paramId ?? '').trim()
  if (raw) {
    const first = raw.split('/')[0]?.trim() ?? ''
    if (UUID_RE.test(first)) return first
  }
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(PATH_UUID_RE)
    if (m?.[1] && UUID_RE.test(m[1])) return m[1]
  }
  return raw.split('/')[0]?.trim() ?? ''
}
