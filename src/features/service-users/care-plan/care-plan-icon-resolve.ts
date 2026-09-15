/**
 * Resolve Available Care Plan card icons so live matches local:
 * prefer bundled imported PNGs (shipped with the SPA), not API /uploads.
 */
import {
  CARE_PLAN_IMPORTED_ICON_FILES,
  CARE_PLAN_STANDARD_ICON_FILES,
} from '@/features/service-users/care-plan/care-plan-icon-assets.generated'

const CUSTOM_FORM_ICON_MARKER = '/care-pathway/forms/'

/** Mirror of backend carePlanPictureSlug — maps form title → gallery slug. */
export function carePlanPictureSlug(name: string): string {
  const key = name.toLowerCase()
  if (key.includes('accident') || key.includes('choking') || key.includes('risk assess')) return 'danger'
  if (key.includes('bed rail') || key.includes('bed ')) return 'bed'
  if (key.includes('charity') || key.includes('hoover') || key.includes('clean')) return 'cleaning'
  if (key.includes('change of carer') || key.includes('carer comm')) return 'carer'
  if (key.includes('communication')) return 'communication'
  if (key.includes('capability')) return 'people'
  if (key.includes('continence')) return 'continence'
  if (key.includes('culture') || key.includes('religion') || key.includes('spirituality')) return 'religion'
  if (
    key.includes('dementia') ||
    key.includes('home care') ||
    key.includes('home support') ||
    key.includes('person centred')
  ) {
    return 'care-at-home'
  }
  if (key.includes('eating') || key.includes('drinking')) return 'drinks'
  if (key.includes('falls') || key.includes('mobility')) return 'mobility'
  if (key.includes('final days')) return 'palliative'
  if (key.includes('infection')) return 'infection'
  if (key.includes('medication')) return 'medication'
  if (key.includes('pain')) return 'pain'
  if (key.includes('pressure')) return 'pressure-ulcer'
  if (key.includes('psycholog') || key.includes('cognition') || key.includes('behaviour')) return 'psychology'
  if (key.includes('skin')) return 'health'
  if (key.includes('sleep') || key.includes('night')) return 'bed'
  if (key.includes('social') || key.includes('activities')) return 'activities'
  if (key.includes('washing') || key.includes('dressing')) return 'personal-washing'
  if (key.includes('safety') || key.includes('family')) return 'family-care'
  if (key.includes('physical')) return 'health'
  if (key.includes('advance') || key.includes('review') || key.includes('risk')) return 'care-plan'
  return 'care-plan'
}

function slugFromGalleryPath(pictureUrl: string): { folder: 'imported' | 'standard'; slug: string; file: string } | null {
  try {
    let pathname = pictureUrl.trim()
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname
    const m = pathname.match(/\/(?:files\/)?uploads\/care-pathway\/(imported|standard)\/([^/?#]+)$/i)
    if (!m) return null
    const folder = m[1]!.toLowerCase() as 'imported' | 'standard'
    const file = m[2]!
    const slug = file.replace(/\.[^.]+$/i, '')
    return { folder, slug, file }
  } catch {
    return null
  }
}

function bundledForSlug(slug: string): string | null {
  return CARE_PLAN_IMPORTED_ICON_FILES[slug] ?? CARE_PLAN_STANDARD_ICON_FILES[slug] ?? null
}

/**
 * Icon URL for care-plan cards. Uses SPA-bundled gallery assets so production
 * does not depend on server upload files being present.
 */
export function resolveCarePlanCardPictureUrl(
  title: string,
  pictureUrl?: string | null,
): string | null {
  const trimmed = pictureUrl?.trim() || null

  // Operator-uploaded custom form icons stay on the API media mount.
  if (trimmed?.includes(CUSTOM_FORM_ICON_MARKER)) return trimmed

  const fromPath = trimmed ? slugFromGalleryPath(trimmed) : null
  if (fromPath) {
    if (fromPath.folder === 'imported') {
      const exact = CARE_PLAN_IMPORTED_ICON_FILES[fromPath.slug]
      if (exact) return exact
    }
    const preferred = bundledForSlug(fromPath.slug)
    if (preferred) return preferred
    // Same folder/file under public (after sync), even if not in generated map yet.
    return `/care-plan-icons/${fromPath.folder}/${fromPath.file}`
  }

  const slug = carePlanPictureSlug(title)
  const byName = bundledForSlug(slug)
  if (byName) return byName

  return trimmed
}
