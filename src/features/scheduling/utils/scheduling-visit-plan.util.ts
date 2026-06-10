import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

export function timelineJobVisitPlanSlot(job: TimelineJob): string | null {
  return job.visitPlan?.label ?? null
}

export function timelineJobLinkedCarePlanIds(job: TimelineJob): string[] {
  return job.visitPlan?.linkedCarePlanFormIds ?? []
}

export function formatLinkedCarePlanLabels(
  formIds: string[],
  nameById: Map<string, string>,
): string {
  if (formIds.length === 0) return '—'
  const names = formIds.map((id) => nameById.get(id) ?? 'Care plan').filter(Boolean)
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

export function jobAttentionReason(job: TimelineJob): string | null {
  const allocated = job.allocatedCarers ?? job.allocations?.length ?? 0
  if (job.status === 'NEEDS_ATTENTION') {
    return allocated < job.requiredCarers
      ? `Under-allocated (${allocated}/${job.requiredCarers} carers)`
      : 'Job needs attention'
  }
  if (job.underAllocated || allocated < job.requiredCarers) {
    return `Under-allocated (${allocated}/${job.requiredCarers} carers)`
  }
  if (job.status === 'UNALLOCATED' && job.requiredCarers > 0) {
    return `No carers allocated (0/${job.requiredCarers})`
  }
  return null
}

export function buildCarePlanFormNameMap(
  forms: Array<{ id: string; name: string }>,
): Map<string, string> {
  return new Map(forms.map((f) => [f.id, f.name]))
}
