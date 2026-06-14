import type { CarePlanInstance, CarePlanInstanceDisplayStatus } from '@/features/service-users/care-plans/types'

export function carePlanStatusLabel(instance?: CarePlanInstance | null): string | null {
  if (!instance) return null
  const version = instance.latestPublishedVersion?.versionNumber
  switch (instance.displayStatus) {
    case 'DRAFT':
      return 'Draft'
    case 'PUBLISHED':
      return version ? `Published v${version}` : 'Published'
    case 'PUBLISHED_WITH_DRAFT':
      return version ? `Published v${version} · draft` : 'Published · draft'
    default:
      return null
  }
}

export function carePlanInstancesByFormId(
  instances: CarePlanInstance[] | undefined,
): Map<string, CarePlanInstance> {
  return new Map((instances ?? []).map(row => [row.carePathwayFormId, row]))
}

export function isCarePlanPublished(displayStatus: CarePlanInstanceDisplayStatus | undefined): boolean {
  return displayStatus === 'PUBLISHED' || displayStatus === 'PUBLISHED_WITH_DRAFT'
}
