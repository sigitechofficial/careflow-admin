import { getApiBaseUrl } from '@/shared/lib/api-base'

/**
 * Map stored `/uploads/...` paths onto the API media mount.
 * Production admin SPA and API are often different hosts; some reverse proxies
 * also intercept bare `/uploads` before Nest. `/files/uploads` is served by the API.
 */
function toApiMediaPath(pathname: string): string {
  if (pathname.startsWith('/files/uploads/')) return pathname
  if (pathname.startsWith('/uploads/')) return `/files${pathname}`
  return pathname
}

/** Turn stored `photoUrl` (absolute URL or `/uploads/...` path) into a browser-usable image URL. */
export function resolveMediaUrl(
  photoUrl: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  const u = photoUrl?.trim()
  if (!u) return null

  const base = getApiBaseUrl()
  let resolved: string

  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u)
      if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/files/uploads/')) {
        const mediaPath = toApiMediaPath(parsed.pathname)
        resolved = base ? `${base}${mediaPath}${parsed.search}` : `${mediaPath}${parsed.search}`
      } else {
        resolved = u
      }
    } catch {
      resolved = u
    }
  } else if (u.startsWith('/')) {
    const mediaPath = toApiMediaPath(u)
    resolved = base ? `${base}${mediaPath}` : mediaPath
  } else {
    resolved = u
  }

  if (cacheKey == null || cacheKey === '') return resolved
  const sep = resolved.includes('?') ? '&' : '?'
  return `${resolved}${sep}v=${encodeURIComponent(String(cacheKey))}`
}
