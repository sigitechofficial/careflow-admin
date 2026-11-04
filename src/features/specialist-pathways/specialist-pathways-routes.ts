/** Route path constants for the Specialist Pathways module. */
export const SPECIALIST_PATHWAY_PATHS = {
  landing: '/apps/specialist-pathways',
  /** Dynamic route templates (TanStack param form). */
  list: '/specialist-pathways/$pathway',
  case: '/specialist-pathways/$pathway/$caseId',
} as const

/** Concrete list URL for a pathway slug, e.g. /specialist-pathways/dementia. */
export function pathwayListPath(slug: string): string {
  return `/specialist-pathways/${slug}`
}

export function pathwayCasePath(slug: string, caseId: string): string {
  return `/specialist-pathways/${slug}/${caseId}`
}
