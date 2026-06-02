import { getApiBaseUrl } from '@/shared/lib/api-base'

/** Turn stored `photoUrl` (absolute URL or `/uploads/...` path) into a browser-usable image URL. */
export function resolveMediaUrl(
  photoUrl: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  const u = photoUrl?.trim()
  if (!u) return null
  let resolved: string
  if (/^https?:\/\//i.test(u)) {
    resolved = u
  } else if (u.startsWith('/')) {
    const base = getApiBaseUrl()
    resolved = base ? `${base}${u}` : u
  } else {
    resolved = u
  }
  if (cacheKey == null || cacheKey === '') return resolved
  const sep = resolved.includes('?') ? '&' : '?'
  return `${resolved}${sep}v=${encodeURIComponent(String(cacheKey))}`
}
