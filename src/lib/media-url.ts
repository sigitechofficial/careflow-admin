import { getApiBaseUrl } from '@/lib/api-base'

/** Turn stored `photoUrl` (absolute URL or `/uploads/...` path) into a browser-usable image URL. */
export function resolveMediaUrl(photoUrl: string | null | undefined): string | null {
  const u = photoUrl?.trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('/')) {
    const base = getApiBaseUrl()
    return base ? `${base}${u}` : u
  }
  return u
}
