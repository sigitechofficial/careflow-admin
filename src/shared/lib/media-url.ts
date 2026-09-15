import { getApiBaseUrl } from '@/shared/lib/api-base'
import {
  CARE_PLAN_IMPORTED_ICON_FILES,
  CARE_PLAN_STANDARD_ICON_FILES,
} from '@/features/service-users/care-plan/care-plan-icon-assets.generated'

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

/**
 * Gallery icons also ship under `/care-plan-icons/{imported|standard}/` so the SPA
 * can show them without depending on live API upload files.
 * Prefer rich imported PNGs when both exist for the same slug.
 */
function bundledCarePathwayGalleryPath(pathname: string): string | null {
  const m = pathname.match(/\/(?:files\/)?uploads\/care-pathway\/(imported|standard)\/([^/?#]+)$/i)
  if (!m) return null
  const slug = m[2]!.replace(/\.[^.]+$/i, '')
  return (
    CARE_PLAN_IMPORTED_ICON_FILES[slug] ??
    CARE_PLAN_STANDARD_ICON_FILES[slug] ??
    `/care-plan-icons/${m[1]!.toLowerCase()}/${m[2]}`
  )
}

/** Turn stored `photoUrl` (absolute URL or `/uploads/...` path) into a browser-usable image URL. */
export function resolveMediaUrl(
  photoUrl: string | null | undefined,
  cacheKey?: string | number | null,
): string | null {
  const u = photoUrl?.trim()
  if (!u) return null

  // Already a Vite public asset (care-plan gallery sync).
  if (u.startsWith('/care-plan-icons/')) {
    if (cacheKey == null || cacheKey === '') return u
    const sep = u.includes('?') ? '&' : '?'
    return `${u}${sep}v=${encodeURIComponent(String(cacheKey))}`
  }

  const base = getApiBaseUrl()
  let resolved: string

  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u)
      const bundled = bundledCarePathwayGalleryPath(parsed.pathname)
      if (bundled) {
        resolved = bundled
      } else if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/files/uploads/')) {
        const mediaPath = toApiMediaPath(parsed.pathname)
        resolved = base ? `${base}${mediaPath}${parsed.search}` : `${mediaPath}${parsed.search}`
      } else {
        resolved = u
      }
    } catch {
      resolved = u
    }
  } else if (u.startsWith('/')) {
    const bundled = bundledCarePathwayGalleryPath(u)
    if (bundled) {
      resolved = bundled
    } else {
      const mediaPath = toApiMediaPath(u)
      resolved = base ? `${base}${mediaPath}` : mediaPath
    }
  } else {
    resolved = u
  }

  if (cacheKey == null || cacheKey === '') return resolved
  const sep = resolved.includes('?') ? '&' : '?'
  return `${resolved}${sep}v=${encodeURIComponent(String(cacheKey))}`
}
